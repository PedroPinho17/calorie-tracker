import { z } from 'zod';

/**
 * Schemas partilhados entre a API (validação dos pedidos) e a web (tipos).
 * Implementam Standard Schema, por isso o Nest usa-os diretamente em @Body({ schema }).
 */

/**
 * Fontes dos alimentos:
 * - insa: Tabela da Composição de Alimentos portuguesa (importada; ver apps/api/src/scripts/import-insa.ts)
 * - usda: USDA FoodData Central · off: Open Food Facts (códigos de barras)
 */
export const FOOD_SOURCES = ['insa', 'usda', 'off', 'custom'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/** Citação obrigatória pelas condições de utilização da tabela do INSA. */
export const INSA_ATTRIBUTION =
  'Fonte: Base de Dados da Composição de Alimentos. Instituto Nacional de Saúde Doutor Ricardo Jorge, I. P. - INSA. v 7.1 - 2026';

/** Alimento escolhido de uma fonte externa, com macros por 100 g. */
export const pickedFoodSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(300),
  kcalPer100g: z.number().min(0).max(1000),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  source: z.enum(FOOD_SOURCES).default('usda'),
});
export type PickedFood = z.infer<typeof pickedFoodSchema>;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof mealTypeSchema>;

/** Data no formato YYYY-MM-DD. */
export const isoDateSchema = z.iso.date();

export const gramsSchema = z.number().positive().max(5000);

/** POST /foods/confirm — liga o nome dado pelo Gemini a um alimento escolhido. */
export const confirmFoodSchema = z.object({
  alias: z.string().trim().min(1).max(200),
  picked: pickedFoodSchema,
});
export type ConfirmFoodInput = z.infer<typeof confirmFoodSchema>;

/** POST /meals — guarda uma refeição. Os macros são calculados no servidor. */
export const createMealSchema = z.object({
  date: isoDateSchema,
  type: mealTypeSchema,
  items: z
    .array(z.object({ grams: gramsSchema, picked: pickedFoodSchema }))
    .min(1)
    .max(50),
});
export type CreateMealInput = z.infer<typeof createMealSchema>;

/** GET /foods/search?q= */
export const searchQuerySchema = z.object({ q: z.string().trim().min(2).max(100) });

/** GET /meals/day?date= */
export const dayQuerySchema = z.object({ date: isoDateSchema });

/** PUT /goals — metas diárias de kcal, macros e água. */
export const goalSchema = z.object({
  kcal: z.number().int().min(500).max(10000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(1000),
  fat: z.number().int().min(0).max(1000),
  // Opcional para clientes antigos; a BD tem 2000 ml por defeito.
  waterMl: z.number().int().min(0).max(10000).optional(),
});
export type GoalInput = z.infer<typeof goalSchema>;

/** PATCH /meals/:mealId/items/:itemId — troca o alimento e/ou as gramas de uma refeição já guardada. */
export const updateMealItemSchema = z
  .object({ grams: gramsSchema.optional(), picked: pickedFoodSchema.optional() })
  .refine((v) => v.grams !== undefined || v.picked !== undefined, 'Indica as gramas ou o alimento.');
export type UpdateMealItemInput = z.infer<typeof updateMealItemSchema>;

/** POST /water — um registo de água (ex.: um copo). */
export const addWaterSchema = z.object({
  date: isoDateSchema,
  ml: z.number().int().min(50).max(3000),
});
export type AddWaterInput = z.infer<typeof addWaterSchema>;

/** PUT /weight — peso de um dia (um registo por dia; voltar a enviar substitui). */
export const weightSchema = z.object({
  date: isoDateSchema,
  kg: z.number().min(20).max(400),
});
export type WeightInput = z.infer<typeof weightSchema>;

/** GET /weight?days=90 */
export const weightQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(730).default(90),
});
export type WeightQuery = z.infer<typeof weightQuerySchema>;


/** GET /meals/history?end=YYYY-MM-DD&days=7 */
export const historyQuerySchema = z.object({
  end: isoDateSchema,
  days: z.coerce.number().int().min(1).max(31).default(7),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

/** POST /auth/login */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Limite superior: evita gastar CPU a fazer hash de passwords enormes.
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Password nova (registo e recuperação). */
export const newPasswordSchema = z
  .string()
  .min(10, 'A password tem de ter pelo menos 10 caracteres.')
  .max(128, 'A password pode ter no máximo 128 caracteres.');

/** POST /auth/register */
export const registerSchema = loginSchema.extend({ password: newPasswordSchema });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Línguas da interface (também usadas no email de recuperação). */
export const localeSchema = z.enum(['pt', 'en']);

/** POST /auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: loginSchema.shape.email,
  locale: localeSchema.default('pt'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /auth/reset-password — token = 32 bytes aleatórios em base64url (43 caracteres). */
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[\w-]{43}$/, 'Link inválido.'),
  password: newPasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
