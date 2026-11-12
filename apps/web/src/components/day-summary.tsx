'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  Trash2Icon,
  UtensilsIcon,
  TargetIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  sumMacros,
  type DaySummary as Day,
  type GoalInput,
  type MealDto,
  type UpdateMealItemInput,
} from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FoodSearch } from '@/components/food-search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteMeal, getDay, updateMealItem } from '@/lib/api';
import { addDays, formatDayLabel } from '@/lib/meals';
import { useErrorMessage, useI18n } from '@/lib/i18n';
import { MacroInline, MacroTiles } from '@/components/macro-summary';
import { cn } from '@/lib/utils';
import { GoalForm } from '@/components/goal-form';

export function DaySummary({
  date,
  today,
  refreshKey,
  goal,
  onGoalChange,
  onMealsChanged,
  onDateChange,
}: {
  date: string;
  today: string;
  refreshKey: number;
  goal: GoalInput | null;
  onGoalChange: (goal: GoalInput) => void;
  /** Uma refeição foi apagada (o histórico da semana tem de recarregar). */
  onMealsChanged: () => void;
  onDateChange: (date: string) => void;
}) {
  const { t, intlLocale } = useI18n();
  const errorMessage = useErrorMessage();
  const [reload, setReload] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  // O resultado guarda a "chave" do pedido: se a chave atual for outra, está a carregar.
  const key = `${date}|${refreshKey}|${reload}`;
  const [result, setResult] = useState<{ key: string; day?: Day; error?: unknown } | null>(null);
  const current = result?.key === key ? result : null;
  const day = current?.day ?? null;
  const error = current && 'error' in current ? errorMessage(current.error, t.day.loadError) : null;

  useEffect(() => {
    let cancelled = false;
    getDay(date).then(
      (d) => !cancelled && setResult({ key, day: d }),
      (err) => !cancelled && setResult({ key, error: err }),
    );
    return () => {
      cancelled = true;
    };
  }, [date, key]);

  /** Uma refeição foi corrigida (alimento trocado ou gramas): atualiza a lista e os totais. */
  function replaceMeal(updated: MealDto) {
    setResult((r) => {
      if (!r?.day) return r;
      const meals = r.day.meals.map((m) => (m.id === updated.id ? updated : m));
      return { ...r, day: { ...r.day, meals, total: sumMacros(meals.flatMap((m) => m.items)) } };
    });
    onMealsChanged();
  }

  async function remove(meal: MealDto) {
    // Otimista: sai da lista logo; se falhar, volta a carregar.
    setResult((r) => {
      if (!r?.day) return r;
      const meals = r.day.meals.filter((m) => m.id !== meal.id);
      return { ...r, day: { ...r.day, meals, total: sumMacros(meals.flatMap((m) => m.items)) } };
    });
    try {
      await deleteMeal(meal.id);
      onMealsChanged();
      toast.success(t.day.deleted(t.meals[meal.type]));
    } catch (err) {
      toast.error(t.day.deleteFailed, { description: errorMessage(err) });
      setReload((n) => n + 1);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.day.previous}
          onClick={() => onDateChange(addDays(date, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <CardTitle className="text-center first-letter:uppercase">
          {formatDayLabel(date, today, intlLocale, t.day)}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.day.next}
          disabled={date >= today}
          onClick={() => onDateChange(addDays(date, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : !day ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <KcalRing kcal={day.total.kcal} goal={goal?.kcal ?? null} />
              {goal && (
                <p
                  className={cn(
                    'text-sm',
                    day.total.kcal > goal.kcal ? 'text-fat' : 'text-muted-foreground',
                  )}
                >
                  {day.total.kcal <= goal.kcal
                    ? t.day.remaining(goal.kcal - day.total.kcal)
                    : t.day.over(day.total.kcal - goal.kcal)}
                </p>
              )}
              {goal && !editingGoal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setEditingGoal(true)}
                >
                  <TargetIcon /> {t.day.editGoals}
                </Button>
              )}
            </div>
            {goal && editingGoal && (
              <GoalForm
                goal={goal}
                onCancel={() => setEditingGoal(false)}
                onSaved={(g) => {
                  onGoalChange(g);
                  setEditingGoal(false);
                }}
              />
            )}
            <MacroTiles total={day.total} goal={goal} />

            {day.meals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
                <UtensilsIcon className="size-5" />
                {t.day.empty}
              </div>
            ) : (
              <ul className="divide-y">
                {day.meals.map((m) => (
                  <MealRow key={m.id} meal={m} onRemove={() => remove(m)} onUpdated={replaceMeal} />
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Anel de progresso das kcal do dia face à meta (vermelho quando passa). */
function KcalRing({ kcal, goal }: { kcal: number; goal: number | null }) {
  const size = 152;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = goal ? Math.min(kcal / goal, 1) : 0;
  const over = goal !== null && kcal > goal;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className={cn('transition-[stroke-dashoffset] duration-700', over ? 'stroke-fat' : 'stroke-primary')}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{kcal}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {goal ? `/ ${goal} kcal` : 'kcal'}
        </span>
      </div>
    </div>
  );
}

function MealRow({
  meal,
  onRemove,
  onUpdated,
}: {
  meal: MealDto;
  onRemove: () => void;
  onUpdated: (meal: MealDto) => void;
}) {
  const { t, intlLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const total = sumMacros(meal.items);
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(meal.createdAt),
  );

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Tocar na refeição mostra/esconde os alimentos (para os corrigir). */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? t.mealEdit.collapse : t.mealEdit.expand}
          className="-m-1 flex min-w-0 flex-1 items-start gap-2 rounded-md p-1 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon
            className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-medium">{t.meals[meal.type]}</span>
              <span className="text-xs text-muted-foreground">{time}</span>
            </span>
            {!open && (
              <span className="block truncate text-xs text-muted-foreground">
                {meal.items.map((i) => i.food.name).join(' · ')}
              </span>
            )}
            <MacroInline macros={total} className="mt-1 text-xs text-muted-foreground" />
          </span>
        </button>
        <span className="shrink-0 pt-0.5 font-semibold tabular-nums">
          {total.kcal}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">kcal</span>
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t.day.deleteMeal}>
          <Trash2Icon />
        </Button>
      </div>

      {open && (
        <ul className="mt-2 ml-6 space-y-1 border-l pl-3">
          {meal.items.map((item) => (
            <SavedItemRow key={item.id} mealId={meal.id} item={item} onUpdated={onUpdated} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Um alimento de uma refeição já guardada: macros, gramas editáveis e "trocar alimento". */
function SavedItemRow({
  mealId,
  item,
  onUpdated,
}: {
  mealId: string;
  item: MealDto['items'][number];
  onUpdated: (meal: MealDto) => void;
}) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [grams, setGrams] = useState(String(Math.round(item.grams)));
  const [swapping, setSwapping] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(input: UpdateMealItemInput) {
    setSaving(true);
    try {
      onUpdated(await updateMealItem(mealId, item.id, input));
      toast.success(t.mealEdit.updated);
      setSwapping(false);
    } catch (err) {
      toast.error(t.mealEdit.updateFailed, { description: errorMessage(err) });
      setGrams(String(Math.round(item.grams)));
    } finally {
      setSaving(false);
    }
  }

  function commitGrams() {
    const value = Math.min(5000, Math.max(1, Math.round(Number(grams))));
    if (!Number.isFinite(value) || value === Math.round(item.grams)) return setGrams(String(Math.round(item.grams)));
    void save({ grams: value });
  }

  return (
    <li className="space-y-2 py-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <p className="truncate text-sm" title={item.food.name}>
            {item.food.name}
            {item.food.source === 'insa' && (
              <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">INSA</span>
            )}
          </p>
          <MacroInline macros={item} className="text-xs text-muted-foreground" />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <label className="relative">
            <span className="sr-only">{t.editor.grams}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={5000}
              value={grams}
              disabled={saving}
              onChange={(e) => setGrams(e.target.value)}
              onBlur={commitGrams}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="h-8 w-20 pr-6 text-right tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
              g
            </span>
          </label>
          <span className="w-14 text-right text-sm font-semibold tabular-nums">{item.kcal}</span>
          <Button
            variant={swapping ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={t.mealEdit.swap}
            title={t.mealEdit.swap}
            disabled={saving}
            onClick={() => setSwapping((s) => !s)}
          >
            {saving ? <Loader2Icon className="animate-spin" /> : <ArrowLeftRightIcon />}
          </Button>
        </div>
      </div>
      {swapping && (
        <FoodSearch
          initialQuery={item.food.name}
          onPick={(food) => void save({ picked: food })}
          onCancel={() => setSwapping(false)}
        />
      )}
    </li>
  );
}
