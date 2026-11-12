'use client';

import { useEffect, useState } from 'react';
import { ClockIcon, Loader2Icon, SearchIcon } from 'lucide-react';
import type { PickedFood, RecentFood } from '@repo/shared';
import { Input } from '@/components/ui/input';
import { getBarcode, getRecent, searchFoods } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';

/** Pesquisa na USDA (com debounce) ou por código de barras e devolve o alimento escolhido. */
export function FoodSearch({
  initialQuery = '',
  onPick,
  onCancel,
}: {
  initialQuery?: string;
  onPick: (food: PickedFood, grams?: number) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PickedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [recent, setRecent] = useState<RecentFood[]>([]);

  const q = query.trim();
  const active = q.length >= 2;
  const isBarcode = /^\d{8,14}$/.test(q);

  useEffect(() => {
    getRecent().then(setRecent, () => setRecent([]));
  }, []);

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(isBarcode ? [await getBarcode(q, ctrl.signal)] : await searchFoods(q, ctrl.signal));
      } catch (err) {
        if (!ctrl.signal.aborted) setError(err ?? new Error());
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, active, isBarcode]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          className="bg-background pr-8 pl-8"
        />
        {active && loading && (
          <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {!active && recent.length > 0 && (
        <ul className="max-h-60 overflow-y-auto">
          <li className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3" /> {t.search.recent}
          </li>
          {recent.map((r) => (
            <li key={r.food.externalId}>
              <button
                type="button"
                onClick={() => onPick(r.food, r.grams)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0 truncate first-letter:uppercase">{r.food.name.toLowerCase()}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{r.grams} g</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && !!error && (
        <p className="px-1 text-xs text-destructive">{errorMessage(error, t.search.error)}</p>
      )}
      {active && !loading && !error && results.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">{t.search.noResults}</p>
      )}

      {active && results.length > 0 && (
        <ul className="max-h-60 overflow-y-auto">
          {results.map((f) => (
            <li key={f.externalId}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="min-w-0 truncate">
                  {f.name}
                  {f.source === 'insa' && (
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">INSA</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {Math.round(f.kcalPer100g)} kcal/100 g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
