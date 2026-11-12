/**
 * Importa a Tabela da Composição de Alimentos do INSA para a tabela `foods` (source = 'insa').
 *
 *   1. Descarrega o Excel em https://portfir.insa.min-saude.pt/ (ex.: insa_tca.xlsx).
 *   2. pnpm --filter api import:insa "C:\caminho\para\insa_tca.xlsx"
 *
 * Pode correr várias vezes: atualiza os alimentos que já existem (pelo código do INSA).
 * O ficheiro não vai para o repositório (direitos de autor do INSA).
 *
 * Condições de utilização (folha "Informação adicional" do ficheiro): é obrigatório mostrar
 * de forma visível a fonte onde os dados aparecem — ver INSA_ATTRIBUTION em @repo/shared.
 */
import ExcelJS from 'exceljs';
import { Food } from '@repo/db';
import dataSource from '../data-source.js';

/** Colunas usadas (cabeçalho da linha com "Cod"), com espaços/quebras normalizados. */
const COLUMNS = {
  code: 'Cod',
  name: 'Nome do alimento',
  kcal: 'Energia [kcal]',
  protein: 'Proteínas [g]',
  carbs: 'Hidratos de carbono [g]',
  fat: 'Lípidos [g]',
} as const;

const normalizeHeader = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

function cellText(v: ExcelJS.CellValue): string {
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('').trim();
  if (v && typeof v === 'object' && 'result' in v) {
    const r = v.result;
    return typeof r === 'string' || typeof r === 'number' ? String(r).trim() : '';
  }
  return '';
}

/** Número entre 0 e max, com 1 casa decimal ("" ou valores inválidos → 0). */
function num(v: ExcelJS.CellValue, max: number) {
  const n = typeof v === 'number' ? v : Number.parseFloat(cellText(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(0, n)) * 10) / 10 : 0;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: pnpm --filter api import:insa <caminho/para/insa_tca.xlsx>');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('O ficheiro não tem folhas.');

  // Encontra a linha do cabeçalho (a que tem "Cod") e o índice de cada coluna.
  let headerRow = 0;
  const index: Partial<Record<keyof typeof COLUMNS, number>> = {};
  ws.eachRow((row, r) => {
    if (headerRow) return;
    const values = (row.values as unknown[]).map(normalizeHeader);
    if (!values.includes(COLUMNS.code)) return;
    headerRow = r;
    for (const [key, label] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][]) {
      const i = values.indexOf(label);
      if (i > 0) index[key] = i;
    }
  });
  const missing = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).filter((k) => !index[k]);
  if (!headerRow || missing.length) {
    throw new Error(`Formato inesperado: faltam as colunas ${missing.map((k) => COLUMNS[k]).join(', ')}.`);
  }

  const foods: Partial<Food>[] = [];
  ws.eachRow((row, r) => {
    if (r <= headerRow) return;
    const code = cellText(row.getCell(index.code!).value);
    const name = cellText(row.getCell(index.name!).value);
    if (!code || !name) return;
    foods.push({
      source: 'insa',
      externalId: code,
      name: name.slice(0, 300),
      kcalPer100g: num(row.getCell(index.kcal!).value, 1000),
      proteinPer100g: num(row.getCell(index.protein!).value, 100),
      carbsPer100g: num(row.getCell(index.carbs!).value, 100),
      fatPer100g: num(row.getCell(index.fat!).value, 100),
    });
  });
  if (foods.length === 0) throw new Error('Não encontrei alimentos no ficheiro.');

  await dataSource.initialize();
  try {
    // Em blocos, com upsert pelo índice único (source, externalId).
    for (let i = 0; i < foods.length; i += 200) {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(Food)
        .values(foods.slice(i, i + 200))
        .orUpdate(['name', 'kcalPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'], ['source', 'externalId'])
        .execute();
    }
    console.log(`Importados/atualizados ${foods.length} alimentos do INSA.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
