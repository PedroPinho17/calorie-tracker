import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Food, FoodAlias } from '@repo/db';
import type { PickedFood } from '@repo/shared';
import type { Env } from '../config.js';

/**
 * IDs dos nutrientes na USDA FoodData Central (valores por 100 g).
 * A energia vem em ids diferentes conforme o dataset:
 * SR Legacy usa 1008; muitos Foundation só têm 2047 (Atwater geral) ou 2048 (específico).
 */
const NUTRIENTS = {
  kcal: [1008, 2048, 2047],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
} as const;

/** A pesquisa devolve { nutrientId, value }; o detalhe de um alimento devolve { nutrient: { id }, amount }. */
type UsdaNutrient = { nutrientId?: number; value?: number; nutrient?: { id?: number }; amount?: number };
type UsdaFood = { fdcId: number; description: string; foodNutrients?: UsdaNutrient[] };

type OffResponse = {
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    nutriments?: Partial<
      Record<'energy-kcal_100g' | 'proteins_100g' | 'carbohydrates_100g' | 'fat_100g', number>
    >;
  };
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_RESULTS = 15;
const CACHE_MAX = 500;
const FETCH_TIMEOUT_MS = 10_000;

/** Formatos de id aceites — também impedem que um id manipulado mude o caminho do URL externo. */
const USDA_ID = /^\d{1,10}$/;
export const BARCODE = /^\d{8,14}$/;

/** Minúsculas e sem acentos: "Pão de Ló" → "pao de lo". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** "Fried Eggs," → "egg fried": minúsculas, sem acentos nem pontuação, singular simples e palavras por ordem. */
export const normalizeAlias = (name: string) =>
  fold(name)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .sort()
    .join(' ');

/**
 * Palavras de pesquisa: sem acentos, só letras e números, com pelo menos 2 caracteres.
 * Como só sobram [a-z0-9], podem ir para um LIKE sem escapar nada.
 */
export const searchWords = (query: string) =>
  [...new Set(fold(query).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length >= 2))].slice(0, 6);

/** Converte um Food da BD para o formato partilhado com a web. */
export function toPicked(food: Food): PickedFood {
  return {
    externalId: food.externalId ?? food.id,
    name: food.name,
    kcalPer100g: food.kcalPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    source: food.source,
  };
}

/**
 * Pesquisa alimentos na USDA / Open Food Facts, guarda-os na BD e gere os
 * "aliases" (nome do Gemini → alimento confirmado pelo utilizador).
 *
 * Segurança: a tabela `foods` é partilhada por todos os utilizadores, por isso os
 * valores nutricionais vêm SEMPRE das fontes externas (via servidor) e nunca do cliente.
 */
@Injectable()
export class FoodsService {
  private readonly logger = new Logger(FoodsService.name);
  // Cache simples em memória: a DEMO_KEY tem limites muito baixos.
  private readonly cache = new Map<string, { at: number; foods: PickedFood[] }>();
  private readonly apiKey: string;

  constructor(
    @InjectRepository(Food) private readonly foodRepo: Repository<Food>,
    @InjectRepository(FoodAlias) private readonly aliasRepo: Repository<FoodAlias>,
    config: ConfigService<Env, true>,
  ) {
    this.apiKey = config.get('USDA_API_KEY', { infer: true });
  }

  /**
   * Pesquisa: primeiro na BD (INSA à frente, depois alimentos já guardados), com as palavras
   * em qualquer ordem, sem acentos e com tolerância a erros; depois junta os resultados da USDA.
   */
  async search(query: string): Promise<PickedFood[]> {
    const words = searchWords(query);
    if (words.length === 0) return [];

    const [local, remote] = await Promise.allSettled([this.searchLocal(words), this.searchUsda(query)]);
    const localFoods = local.status === 'fulfilled' ? local.value.map(toPicked) : [];
    if (local.status === 'rejected') this.logger.error('Pesquisa local falhou', local.reason as Error);
    // A USDA em baixo não deve esconder o que já temos na BD.
    if (remote.status === 'rejected' && localFoods.length === 0) throw remote.reason;
    const remoteFoods = remote.status === 'fulfilled' ? remote.value : [];

    const seen = new Set(localFoods.map((f) => `${f.source}:${f.externalId}`));
    return [...localFoods, ...remoteFoods.filter((f) => !seen.has(`${f.source}:${f.externalId}`))].slice(
      0,
      MAX_RESULTS,
    );
  }

  /**
   * Alimentos da BD em que TODAS as palavras aparecem (por qualquer ordem). Cada palavra pode
   * estar contida no nome ou ser parecida com uma palavra do nome (pg_trgm, operador <%),
   * o que aguenta erros de escrita. Ordem: INSA primeiro, depois os que começam pela 1.ª
   * palavra pesquisada, depois os mais parecidos.
   */
  async searchLocal(words: string[], limit = 10): Promise<Food[]> {
    if (words.length === 0) return [];
    const rows: Food[] = await this.foodRepo.query(
      `SELECT f.* FROM foods f
       WHERE NOT EXISTS (
         SELECT 1 FROM unnest($1::text[]) AS w
         WHERE NOT (f_unaccent(lower(f.name)) LIKE '%' || w || '%' OR w <% f_unaccent(lower(f.name)))
       )
       ORDER BY (f.source = 'insa') DESC,
                -- "francesinha" → "Francesinha, com molho" antes de "Molho para francesinha"
                (f_unaccent(lower(f.name)) LIKE $4 || '%') DESC,
                -- semelhança com o nome inteiro: penaliza nomes com muitas palavras a mais
                similarity($2, f_unaccent(lower(f.name))) DESC,
                length(f.name)
       LIMIT $3`,
      [words, words.join(' '), limit, words[0]],
    );
    return rows;
  }

  /** Melhor correspondência local para um nome (usado na análise de fotos). */
  async bestLocalMatch(name: string): Promise<Food | null> {
    return (await this.searchLocal(searchWords(name), 1))[0] ?? null;
  }

  private async searchUsda(query: string): Promise<PickedFood[]> {
    const key = normalizeAlias(query);
    if (!key) return [];
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.foods;

    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('query', key);
    url.searchParams.set('pageSize', '8');
    // Foundation + SR Legacy = dados de laboratório (mais fiáveis).
    url.searchParams.set('dataType', 'Foundation,SR Legacy');

    const data = await this.usda<{ foods?: UsdaFood[] }>(url, `pesquisa "${key}"`);
    const foods = (data.foods ?? []).map(mapUsdaFood).filter((f) => f.kcalPer100g > 0);
    await this.saveFoods(foods);

    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { at: Date.now(), foods });
    return foods;
  }

  /** Procura um produto embalado pelo código de barras no Open Food Facts (grátis, sem chave). */
  async barcode(code: string): Promise<PickedFood> {
    if (!BARCODE.test(code)) throw new BadRequestException('Código de barras inválido.');
    const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments`;
    let data: OffResponse;
    try {
      // O OFF pede um User-Agent que identifique a app.
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CalorieTracker/0.1 (projeto pessoal)' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      data = (await res.json()) as OffResponse;
    } catch (err) {
      this.logger.error(`Open Food Facts falhou para ${code}`, err as Error);
      throw new ServiceUnavailableException('Não foi possível contactar o Open Food Facts.');
    }

    const n = data.product?.nutriments;
    if (data.status !== 1 || !n) throw new NotFoundException('Produto não encontrado no Open Food Facts.');

    const protein = clamp(n.proteins_100g, 100);
    const carbs = clamp(n.carbohydrates_100g, 100);
    const fat = clamp(n.fat_100g, 100);
    const name = [data.product?.product_name, data.product?.brands?.split(',')[0]]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 300);

    const food: PickedFood = {
      source: 'off',
      externalId: code,
      name: name || `Produto ${code}`,
      kcalPer100g: clamp(n['energy-kcal_100g'] ?? protein * 4 + carbs * 4 + fat * 9, 1000),
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    };
    await this.saveFoods([food]);
    return food;
  }

  /**
   * Devolve o alimento da BD para (source, externalId). Os valores por 100 g que o
   * cliente envie são ignorados; se o alimento ainda não estiver na BD, vai-se buscá-lo à fonte.
   */
  async resolve({ source, externalId }: Pick<PickedFood, 'source' | 'externalId'>): Promise<Food> {
    const existing = await this.foodRepo.findOneBy({ source, externalId });
    if (existing) return existing;

    if (source === 'usda' && USDA_ID.test(externalId)) {
      const data = await this.usda<UsdaFood>(
        new URL(`https://api.nal.usda.gov/fdc/v1/food/${externalId}`),
        `alimento ${externalId}`,
      );
      await this.saveFoods([mapUsdaFood(data)]);
    } else if (source === 'off' && BARCODE.test(externalId)) {
      await this.barcode(externalId);
    } else {
      throw new BadRequestException('Alimento desconhecido. Pesquisa-o outra vez.');
    }
    return this.foodRepo.findOneByOrFail({ source, externalId });
  }

  /** O utilizador confirmou que `alias` (nome do Gemini) corresponde a `picked`. */
  async confirm(userId: string, alias: string, picked: PickedFood) {
    const food = await this.resolve(picked);
    const key = normalizeAlias(alias);
    if (!key) throw new BadRequestException('Nome inválido.');

    const existing = await this.aliasRepo.findOneBy({ userId, alias: key });
    if (existing) {
      existing.food = food;
      existing.timesUsed++;
      await this.aliasRepo.save(existing);
    } else {
      await this.aliasRepo.save(this.aliasRepo.create({ userId, alias: key, food }));
    }
    return toPicked(food);
  }

  async findByAlias(userId: string, name: string) {
    const alias = await this.aliasRepo.findOneBy({ userId, alias: normalizeAlias(name) });
    return alias?.food ?? null;
  }

  /** Grava alimentos vindos das fontes externas. ON CONFLICT evita duplicados em pedidos paralelos. */
  private async saveFoods(foods: PickedFood[]) {
    if (foods.length === 0) return;
    await this.foodRepo.createQueryBuilder().insert().values(foods).orIgnore().execute();
  }

  private async usda<T>(url: URL, what: string): Promise<T> {
    url.searchParams.set('api_key', this.apiKey);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.status === 429) {
        throw new ServiceUnavailableException(
          'Limite de pedidos à USDA atingido. Define USDA_API_KEY no .env ou tenta daqui a pouco.',
        );
      }
      if (res.status === 404) throw new NotFoundException('Alimento não encontrado na USDA.');
      if (!res.ok) throw new Error(`USDA respondeu ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ServiceUnavailableException || err instanceof NotFoundException) throw err;
      // Não registar o URL: leva a api_key.
      this.logger.error(`USDA falhou (${what})`, err as Error);
      throw new ServiceUnavailableException('Não foi possível contactar a base de dados USDA.');
    }
  }
}

/** Valor numérico válido entre 0 e max (as fontes externas às vezes trazem lixo). */
function clamp(v: number | undefined, max: number) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0;
}

export function mapUsdaFood(f: UsdaFood): PickedFood {
  // 1.º id presente da lista (ex.: energia 1008 → 2048 → 2047).
  const get = (ids: readonly number[]) => {
    for (const id of ids) {
      const n = f.foodNutrients?.find((x) => (x.nutrientId ?? x.nutrient?.id) === id);
      const v = n?.value ?? n?.amount;
      if (v != null) return v;
    }
    return undefined;
  };

  const proteinPer100g = clamp(get(NUTRIENTS.protein), 100);
  const carbsPer100g = clamp(get(NUTRIENTS.carbs), 100);
  const fatPer100g = clamp(get(NUTRIENTS.fat), 100);
  // Sem energia declarada → estimativa de Atwater (4/4/9 kcal por g).
  const kcalPer100g = clamp(
    get(NUTRIENTS.kcal) ?? Math.round(proteinPer100g * 4 + carbsPer100g * 4 + fatPer100g * 9),
    1000,
  );

  return {
    externalId: String(f.fdcId),
    name: f.description.slice(0, 300),
    kcalPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    source: 'usda',
  };
}
