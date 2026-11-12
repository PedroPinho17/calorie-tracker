'use client';

import { useEffect, useState } from 'react';
import { CupSodaIcon, DropletIcon, GlassWaterIcon, Loader2Icon, Undo2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { WaterDay } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addWater, deleteWater, getWater } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';

const GLASS_ML = 250;
const BOTTLE_ML = 500;

/** Água do dia selecionado: progresso face à meta e botões para registar um copo/garrafa. */
export function WaterCard({ date, goalMl }: { date: string; goalMl: number }) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [result, setResult] = useState<{ date: string; day: WaterDay } | null>(null);
  const [busy, setBusy] = useState(false);
  const day = result?.date === date ? result.day : null;

  useEffect(() => {
    let cancelled = false;
    getWater(date).then(
      (d) => !cancelled && setResult({ date, day: d }),
      () => !cancelled && setResult({ date, day: { date, totalMl: 0, entries: [] } }),
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function run(action: () => Promise<WaterDay>) {
    setBusy(true);
    try {
      setResult({ date, day: await action() });
    } catch (err) {
      toast.error(t.water.failed, { description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const total = day?.totalMl ?? 0;
  const pct = goalMl > 0 ? Math.min(100, (total / goalMl) * 100) : 0;
  const last = day?.entries.at(-1);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <DropletIcon className="size-4 text-sky-500" /> {t.water.title}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.water.undo}
          title={t.water.undo}
          disabled={!last || busy}
          onClick={() => last && void run(() => deleteWater(last.id))}
        >
          <Undo2Icon />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!day ? (
          <div className="flex justify-center py-2 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-semibold tabular-nums">
                {total}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{t.water.of(goalMl)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {total >= goalMl ? t.water.done : t.water.remaining(goalMl - total)}
              </p>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={total}
              aria-valuemax={goalMl}
              aria-label={t.water.title}
            >
              <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={busy} onClick={() => void run(() => addWater(date, GLASS_ML))}>
                <GlassWaterIcon /> {t.water.glass} +{GLASS_ML} ml
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void run(() => addWater(date, BOTTLE_ML))}>
                <CupSodaIcon /> {t.water.bottle} +{BOTTLE_ML} ml
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
