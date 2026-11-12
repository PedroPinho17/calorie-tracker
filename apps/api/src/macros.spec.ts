import { scaleMacros, sumMacros } from '@repo/shared';

describe('macros', () => {
  const egg = { kcalPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5 };

  it('escala os valores por 100 g para a porção', () => {
    expect(scaleMacros(egg, 50)).toEqual({ kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 });
  });

  it('soma macros ignorando valores em falta', () => {
    expect(sumMacros([{ kcal: 100, protein: 1.25 }, { kcal: 50, fat: 2 }, {}])).toEqual({
      kcal: 150,
      protein: 1.3,
      carbs: 0,
      fat: 2,
    });
  });
});
