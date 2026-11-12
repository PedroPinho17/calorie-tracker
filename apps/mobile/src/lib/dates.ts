import type { MealType } from '@repo/shared';

/** Data local em YYYY-MM-DD (toISOString usaria UTC e podia dar o dia errado). */
export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" → Date à meia-noite local. */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(iso: string, days: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export const today = () => toISODate(new Date());

/** Tipo de refeição mais provável para a hora atual. */
export function guessMealType(now = new Date()): MealType {
  const h = now.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
}
