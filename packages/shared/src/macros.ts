/** Energia e macronutrientes (kcal e gramas). */
export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Valores nutricionais por 100 g de um alimento. */
export type Per100g = {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros para uma porção: (gramas / 100) × valor por 100 g. */
export function scaleMacros(food: Per100g, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcalPer100g * f),
    protein: round1(food.proteinPer100g * f),
    carbs: round1(food.carbsPer100g * f),
    fat: round1(food.fatPer100g * f),
  };
}

/** Soma uma lista de macros (valores em falta contam como 0). */
export function sumMacros(list: Iterable<Partial<Macros>>): Macros {
  let t = ZERO_MACROS;
  for (const m of list) {
    t = {
      kcal: t.kcal + (m.kcal ?? 0),
      protein: round1(t.protein + (m.protein ?? 0)),
      carbs: round1(t.carbs + (m.carbs ?? 0)),
      fat: round1(t.fat + (m.fat ?? 0)),
    };
  }
  return t;
}
