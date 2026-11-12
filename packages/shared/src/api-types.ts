import type { Macros, Per100g } from './macros.js';
import type { FoodSource, MealType, PickedFood } from './schemas.js';

/** Item devolvido por POST /vision/analyze. */
export type AnalyzedItem = {
  /** Nome dado pelo Gemini, em português (usado como alias ao confirmar). */
  name: string;
  grams: number;
  /** Alimento correspondente (aprendido, INSA ou USDA), ou null. */
  food: PickedFood | null;
  /** true se a correspondência veio de uma confirmação anterior. */
  learned: boolean;
  /** Confiança do Gemini na identificação (0 a 1). Abaixo de ~0.6 convém confirmar. */
  confidence: number;
  macros: Macros | null;
};

export type Analysis = {
  items: AnalyzedItem[];
  total: Macros;
};

/** Abaixo disto a interface pede ao utilizador para confirmar o alimento. */
export const LOW_CONFIDENCE = 0.6;

export type MealItemDto = {
  id: string;
  grams: number;
  food: { id: string; name: string; source: FoodSource; externalId: string | null } & Per100g;
} & Macros;

export type MealDto = {
  id: string;
  date: string;
  type: MealType;
  createdAt: string;
  items: MealItemDto[];
};

export type DaySummary = {
  date: string;
  meals: MealDto[];
  total: Macros;
};

export type HistoryDay = {
  date: string;
  total: Macros;
};

export type RecentFood = { food: PickedFood; grams: number };

/** GET /water?date= — água bebida num dia. */
export type WaterDay = {
  date: string;
  totalMl: number;
  entries: { id: string; ml: number; createdAt: string }[];
};

/** GET /weight — um registo de peso por dia. */
export type WeightEntry = { date: string; kg: number };

/** Utilizador autenticado (GET /auth/me). */
export type UserDto = { id: string; email: string };

/** Resposta de POST /auth/mobile/login e /auth/mobile/register. */
export type MobileSession = { user: UserDto; token: string };
