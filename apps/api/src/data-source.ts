import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Food, FoodAlias, Goal, Meal, MealItem, PasswordReset, Session, User, WaterLog, WeightLog } from '@repo/db';
import { Init1762770000000 } from './migrations/1762770000000-Init.js';
import { AddGoals1794387788896 } from './migrations/1794387788896-AddGoals.js';
import { NormalizeAliases1794400000000 } from './migrations/1794400000000-NormalizeAliases.js';
import { AddAuth1794392423482 } from './migrations/1794392423482-AddAuth.js';
import { AddPasswordResets1794393689570 } from './migrations/1794393689570-AddPasswordResets.js';
import { NutritionTracking1794415438423 } from './migrations/1794415438423-NutritionTracking.js';

/**
 * DataSource usado pela CLI do TypeORM (migration:generate / migration:run).
 * A app Nest reutiliza as mesmas entidades e migrations (ver app.module.ts).
 */
export const entities = [User, Session, PasswordReset, Food, FoodAlias, Meal, MealItem, Goal, WaterLog, WeightLog];

// Lista explícita (em vez de um glob de ficheiros): funciona igual no build, na CLI e nos
// testes (que correm o .ts). Ao gerar uma migration nova, acrescenta-a aqui.
export const migrations = [
  Init1762770000000,
  AddGoals1794387788896,
  NormalizeAliases1794400000000,
  AddAuth1794392423482,
  AddPasswordResets1794393689570,
  NutritionTracking1794415438423,
];

try {
  // dist/data-source.js → raiz do monorepo
  process.loadEnvFile(join(import.meta.dirname, '..', '..', '..', '.env'));
} catch {
  // Sem .env (ex.: produção) → usa as variáveis do ambiente.
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations,
});
