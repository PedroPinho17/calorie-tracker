import { mapUsdaFood, normalizeAlias } from './foods.service.js';

describe('normalizeAlias', () => {
  it('ignora maiúsculas, pontuação, plurais simples e ordem das palavras', () => {
    expect(normalizeAlias('Fried Eggs,')).toBe('egg fried');
    expect(normalizeAlias('eggs   FRIED')).toBe('egg fried');
    expect(normalizeAlias('Swiss glass')).toBe('glass swiss');
  });
});

describe('mapUsdaFood', () => {
  it('lê o formato da pesquisa ({ nutrientId, value })', () => {
    expect(
      mapUsdaFood({
        fdcId: 1,
        description: 'Egg',
        foodNutrients: [
          { nutrientId: 1008, value: 143 },
          { nutrientId: 1003, value: 12.6 },
          { nutrientId: 1005, value: 0.7 },
          { nutrientId: 1004, value: 9.5 },
        ],
      }),
    ).toEqual({
      source: 'usda',
      externalId: '1',
      name: 'Egg',
      kcalPer100g: 143,
      proteinPer100g: 12.6,
      carbsPer100g: 0.7,
      fatPer100g: 9.5,
    });
  });

  it('lê o formato do detalhe ({ nutrient: { id }, amount }) e estima kcal se faltar', () => {
    const food = mapUsdaFood({
      fdcId: 2,
      description: 'Rice',
      foodNutrients: [
        { nutrient: { id: 1003 }, amount: 2 },
        { nutrient: { id: 1005 }, amount: 28 },
        { nutrient: { id: 1004 }, amount: 0.5 },
      ],
    });
    expect(food.kcalPer100g).toBe(Math.round(2 * 4 + 28 * 4 + 0.5 * 9));
    expect(food.carbsPer100g).toBe(28);
  });

  it('corta valores impossíveis vindos da fonte', () => {
    const food = mapUsdaFood({
      fdcId: 3,
      description: 'Lixo',
      foodNutrients: [
        { nutrientId: 1008, value: 99999 },
        { nutrientId: 1003, value: -5 },
      ],
    });
    expect(food.kcalPer100g).toBe(1000);
    expect(food.proteinPer100g).toBe(0);
  });
});
