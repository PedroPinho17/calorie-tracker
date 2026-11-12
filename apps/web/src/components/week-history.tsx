'use client';

import { useEffect, useState } from 'react';
import type { GoalInput, HistoryDay } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHistory } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { parseISODate } from '@/lib/meals';

/** Barras com as kcal dos últimos 7 dias e uma linha tracejada na meta. Clicar num dia abre-o no resumo. */
export function WeekHistory({ today, selected, refreshKey, goal, onSelect }: {
  today: string;
  selected: string;
  /** Muda sempre que as refeições mudam → recarrega. */
  refreshKey: string;
  goal: GoalInput | null;
  onSelect: (date: string) => void;
}) {
  const { t, intlLocale } = useI18n();
  const [days, setDays] = useState<HistoryDay[] | null>(null);

  useEffect(() => {
    // Em erro, o cartão não aparece (o resumo do dia já mostra o erro).
    getHistory(today).then(setDays, () => setDays(null));
  }, [today, refreshKey]);

  if (!days) return null;

  // 10% de folga acima do maior valor, para a barra mais alta não colar ao topo.
  const max = Math.max(goal?.kcal ?? 0, ...days.map((d) => d.total.kcal), 1) * 1.1;
  const logged = days.filter((d) => d.total.kcal > 0);
  const average = logged.length
    ? Math.round(logged.reduce((sum, d) => sum + d.total.kcal, 0) / logged.length)
    : null;
  const weekday = (iso: string, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(intlLocale, { weekday: style }).format(parseISODate(iso)).replace('.', '');

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle className="text-sm">{t.week.title}</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {average !== null && <span className="tabular-nums">{t.week.average(average)}</span>}
          {goal && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <span className="w-3 border-t border-dashed border-muted-foreground" />
              {t.week.goal(goal.kcal)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative grid grid-cols-7 gap-2">
          {/* Linha da meta, à altura certa sobre as calhas (que começam 22px abaixo do topo). */}
          {goal && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-5.5 z-10 h-28">
              <div
                className="absolute inset-x-0 border-t border-dashed border-muted-foreground/60"
                style={{ bottom: `${(goal.kcal / max) * 100}%` }}
              />
            </div>
          )}
          {days.map((d) => {
            const isSelected = d.date === selected;
            const over = goal ? d.total.kcal > goal.kcal : false;
            // "Seg", "Ter"… (o pt-PT devolve "segunda" no formato curto, que não cabe no telemóvel).
            const label = weekday(d.date, 'short').slice(0, 3);
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onSelect(d.date)}
                aria-pressed={isSelected}
                aria-label={`${weekday(d.date, 'long')}: ${d.total.kcal} kcal`}
                className="group flex flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    'h-4 text-[11px] leading-4 tabular-nums',
                    isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {d.total.kcal > 0 ? d.total.kcal : ''}
                </span>
                <span className="relative h-28 w-full overflow-hidden rounded-md bg-muted/70 transition-colors group-hover:bg-muted">
                  <span
                    className={cn(
                      'absolute inset-x-0 bottom-0 rounded-md transition-[height,opacity] duration-500',
                      over ? 'bg-fat' : 'bg-primary',
                      !isSelected && 'opacity-45',
                    )}
                    style={{ height: `${(d.total.kcal / max) * 100}%` }}
                  />
                </span>
                <span
                  className={cn(
                    'text-xs capitalize',
                    isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}