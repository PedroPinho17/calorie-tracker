import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Meal, MealItem } from '@repo/db';
import {
  scaleMacros,
  sumMacros,
  type CreateMealInput,
  type HistoryQuery,
  type UpdateMealItemInput,
} from '@repo/shared';
import { FoodsService, toPicked } from '../foods/foods.service.js';

/** Soma dias a uma data YYYY-MM-DD (em UTC, para não mudar de dia por causa do fuso). */
function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Todas as operações recebem o userId da sessão: cada utilizador só vê e mexe nas suas refeições. */
@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Meal) private readonly mealRepo: Repository<Meal>,
    @InjectRepository(MealItem) private readonly itemRepo: Repository<MealItem>,
    private readonly foods: FoodsService,
  ) {}

  /**
   * Guarda a refeição. Os macros são calculados aqui a partir do alimento da BD —
   * nunca confiamos nos valores nutricionais enviados pelo cliente.
   */
  async create(userId: string, dto: CreateMealInput) {
    const items = await Promise.all(
      dto.items.map(async ({ grams, picked }) => {
        const food = await this.foods.resolve(picked);
        // Ficam gravados no MealItem: o histórico não muda se o Food mudar depois.
        return { food, grams, ...scaleMacros(food, grams) };
      }),
    );

    // cascade: true na entity Meal → os items são guardados junto com a meal.
    const meal = await this.mealRepo.save(
      this.mealRepo.create({ userId, date: dto.date, type: dto.type, items }),
    );
    const { userId: _owner, ...rest } = meal;
    return rest;
  }

  /** Resumo diário: todas as meals da data + soma de macros. */
  async day(userId: string, date: string) {
    const meals = await this.mealRepo.find({ where: { userId, date }, order: { createdAt: 'ASC' } });
    const total = sumMacros(meals.flatMap((m) => m.items));
    return { date, meals, total };
  }

  /**
   * Corrige um alimento de uma refeição já guardada: troca-o e/ou muda as gramas.
   * Os macros são recalculados a partir do alimento da BD (nunca do cliente).
   */
  async updateItem(userId: string, mealId: string, itemId: string, input: UpdateMealItemInput) {
    // Só encontra o item se a refeição for deste utilizador (senão 404, sem revelar que existe).
    const item = await this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.meal', 'meal')
      .innerJoinAndSelect('item.food', 'food')
      .where('item.id = :itemId AND meal.id = :mealId AND meal.userId = :userId', { itemId, mealId, userId })
      .getOne();
    if (!item) throw new NotFoundException('Alimento não encontrado nesta refeição');

    const food = input.picked ? await this.foods.resolve(input.picked) : item.food;
    const grams = input.grams ?? item.grams;
    Object.assign(item, { food, grams, ...scaleMacros(food, grams) });
    await this.itemRepo.save(item);

    const meal = await this.mealRepo.findOneByOrFail({ id: mealId, userId });
    return meal;
  }

  async remove(userId: string, id: string) {
    // O filtro por userId faz com que apagar a refeição de outra pessoa dê 404 (não revela que existe).
    const { affected } = await this.mealRepo.delete({ id, userId });
    if (!affected) throw new NotFoundException('Refeição não encontrada');
  }

  /** Total de cada dia entre (end - days + 1) e end; os dias sem refeições vêm a 0. */
  async history(userId: string, { end, days }: HistoryQuery) {
    const start = addDays(end, -(days - 1));
    const meals = await this.mealRepo.find({ where: { userId, date: Between(start, end) } });

    const byDate = new Map<string, MealItem[]>();
    for (const m of meals) byDate.set(m.date, [...(byDate.get(m.date) ?? []), ...m.items]);

    return Array.from({ length: days }, (_, i) => {
      const date = addDays(start, i);
      return { date, total: sumMacros(byDate.get(date) ?? []) };
    });
  }

  /** Últimos alimentos diferentes que o utilizador comeu, com as gramas da última vez. */
  async recent(userId: string, limit = 10) {
    const items = await this.itemRepo
      .createQueryBuilder('item')
      .innerJoin('item.meal', 'meal')
      .innerJoinAndSelect('item.food', 'food')
      .where('meal.userId = :userId', { userId })
      .orderBy('meal.createdAt', 'DESC')
      .limit(100)
      .getMany();

    // Fica só a vez mais recente de cada alimento.
    const seen = new Set<string>();
    return items
      .filter((i) => {
        const key = `${i.food.name.toLowerCase()}:${Math.round(i.food.kcalPer100g)}`;
        return !seen.has(key) && seen.add(key);
      })
      .slice(0, limit)
      .map((i) => ({ food: toPicked(i.food), grams: Math.round(i.grams) }));
  }
}
