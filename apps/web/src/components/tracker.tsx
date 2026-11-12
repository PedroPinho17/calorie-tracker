'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { INSA_ATTRIBUTION, type GoalInput } from '@repo/shared';
import { PhotoAnalyzer } from '@/components/photo-analyzer';
import { DaySummary } from '@/components/day-summary';
import { toISODate } from '@/lib/meals';
import { WeekHistory } from '@/components/week-history';
import { WaterCard } from '@/components/water-card';
import { WeightCard } from '@/components/weight-card';
import { getGoal } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const noopSubscribe = () => () => {};

/**
 * Liga o analisador ao resumo do dia e ao histórico. As metas vivem aqui (uma só fonte),
 * e qualquer alteração — guardar ou apagar refeições, mudar metas — chega aos dois.
 */
export function Tracker() {
  // "Hoje" vem do relógio do browser; no servidor é null
  // (o servidor não sabe o fuso horário do utilizador).
  const today = useSyncExternalStore(
    noopSubscribe,
    () => toISODate(new Date()),
    () => null,
  );
  const { t } = useI18n();
  const [picked, setPicked] = useState<string | null>(null);
  // refreshKey: refeição guardada (recarrega resumo e histórico).
  // historyKey: refeição apagada no resumo (que já se atualizou sozinho) → só o histórico.
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [goal, setGoal] = useState<GoalInput | null>(null);
  const date = picked ?? today;

  useEffect(() => {
    getGoal().then(setGoal, () => setGoal(null)); // sem meta, o resto continua a funcionar
  }, []);

  return (
    // Telemóvel: registo → resumo do dia (+ água) → semana → peso, empilhados.
    // Desktop: à esquerda o registo, a semana e o peso; à direita o resumo do dia e a água.
    // grid-cols-1 (= minmax(0, 1fr)) impede que conteúdo largo estique a página no telemóvel.
    // grid-rows-[auto_1fr]: a 1.ª linha fica do tamanho do registo; a altura extra do resumo
    // (que ocupa as duas linhas) vai para a 2.ª, e a semana fica logo abaixo do registo.
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start">
      <section className="space-y-3 lg:col-start-1">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">{t.photo.newMeal}</h2>
        <PhotoAnalyzer date={date} onSaved={() => setRefreshKey((k) => k + 1)} />
      </section>
      {today && date && (
        <section className="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">{t.day.summary}</h2>
          <DaySummary
            date={date}
            today={today}
            refreshKey={refreshKey}
            goal={goal}
            onGoalChange={setGoal}
            onMealsChanged={() => setHistoryKey((k) => k + 1)}
            onDateChange={setPicked}
          />
          <WaterCard date={date} goalMl={goal?.waterMl ?? 2000} />
        </section>
      )}
      {today && date && (
        <section className="space-y-8 lg:col-start-1">
          <WeekHistory
            today={today}
            selected={date}
            refreshKey={`${refreshKey}:${historyKey}`}
            goal={goal}
            onSelect={setPicked}
          />
          <WeightCard today={today} />
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            {t.sources} {INSA_ATTRIBUTION}.
          </p>
        </section>
      )}
    </div>
  );
}
