'use client';

import { useEffect, useState } from 'react';
import { Loader2Icon, ScaleIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import type { WeightEntry } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getWeights, saveWeight } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';
import { parseISODate } from '@/lib/meals';

/** Registo do peso de hoje e gráfico dos últimos 90 dias. */
export function WeightCard({ today }: { today: string }) {
  const { t, intlLocale } = useI18n();
  const errorMessage = useErrorMessage();
  const [entries, setEntries] = useState<WeightEntry[] | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWeights(90).then(setEntries, () => setEntries([]));
  }, []);

  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const kg = Number(value.replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) return toast.error(t.weight.invalid);
    setSaving(true);
    try {
      const saved = await saveWeight(today, Math.round(kg * 10) / 10);
      setEntries((list) => [...(list ?? []).filter((x) => x.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date)));
      setValue('');
      toast.success(t.weight.saved);
    } catch (err) {
      toast.error(t.weight.failed, { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(parseISODate(iso));
  const first = entries?.[0];
  const last = entries?.at(-1);
  const spanDays =
    first && last ? Math.round((parseISODate(last.date).getTime() - parseISODate(first.date).getTime()) / 86_400_000) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScaleIcon className="size-4 text-primary" /> {t.weight.title}
        </CardTitle>
        {first && last && spanDays > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{t.weight.change(last.kg - first.kg, spanDays)}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={save} className="flex items-end gap-2">
          <label className="flex-1 space-y-1 text-xs text-muted-foreground">
            {t.weight.label}
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={20}
              max={400}
              placeholder={last ? String(last.kg) : '70.0'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={saving || !value}>
            {saving && <Loader2Icon className="animate-spin" />}
            {t.weight.save}
          </Button>
        </form>

        {!entries ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : entries.length < 2 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.weight.empty}</p>
        ) : (
          <div className="h-44 w-full" aria-label={t.weight.range} role="img">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} kg`, t.weight.title]}
                  labelFormatter={(l) => shortDate(String(l))}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: 'var(--primary)' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
