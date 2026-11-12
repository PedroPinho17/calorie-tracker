'use client';

import type { GoalInput, Macros } from '@repo/shared';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

export const MACROS = [
  { key: 'protein', kcalPerGram: 4, color: 'bg-protein' },
  { key: 'carbs', kcalPerGram: 4, color: 'bg-carbs' },
  { key: 'fat', kcalPerGram: 9, color: 'bg-fat' },
] as const;

/** Barra empilhada com a fração de energia que vem de cada macro. */
export function MacroBar({ total, className }: { total: Macros; className?: string }) {
  const { t } = useI18n();
  const energy = MACROS.map((m) => total[m.key] * m.kcalPerGram);
  const sum = energy.reduce((a, b) => a + b, 0);

  return (
    <div className={cn('flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted', className)}>
      {sum > 0 &&
        MACROS.map((m, i) => (
          <div
            key={m.key}
            className={cn('h-full transition-[width] duration-500', m.color)}
            style={{ width: `${(energy[i] / sum) * 100}%` }}
            title={t.macroEnergyShare(t.macros[m.key], Math.round((energy[i] / sum) * 100))}
          />
        ))}
    </div>
  );
}

export function MacroTiles({ total, goal }: { total: Macros; goal?: GoalInput | null }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-2">
      {MACROS.map((m) => {
        const target = goal?.[m.key];
        const pct = target ? Math.min(100, (total[m.key] / target) * 100) : 0;
        return (
          <div key={m.key} className="rounded-lg bg-muted/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', m.color)} />
              {t.macros[m.key]}
            </div>
            <p className="mt-1 text-base font-semibold whitespace-nowrap tabular-nums sm:text-lg">
              {total[m.key]}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground sm:text-sm">
                {target ? ` / ${target} g` : 'g'}
              </span>
            </p>
            {target ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full transition-[width] duration-500', m.color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Linha compacta "● 12 g ● 30 g ● 5 g" para listas. */
export function MacroInline({ macros, className }: { macros: Macros; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex flex-wrap gap-x-3 tabular-nums', className)}>
      {MACROS.map((m) => (
        <span key={m.key} className="inline-flex items-center gap-1" title={t.macros[m.key]}>
          <span className={cn('size-1.5 rounded-full', m.color)} />
          {macros[m.key]} g
        </span>
      ))}
    </span>
  );
}
