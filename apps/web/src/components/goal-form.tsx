'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { GoalInput } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateGoal } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';

const FIELDS = ['kcal', 'protein', 'carbs', 'fat', 'waterMl'] as const;

export function GoalForm({ goal, onSaved, onCancel }: {
  goal: GoalInput;
  onSaved: (goal: GoalInput) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [values, setValues] = useState(goal);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSaved(await updateGoal(values));
      toast.success(t.goals.saved);
    } catch (err) {
      toast.error(t.goals.saveFailed, { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((key) => (
          <label key={key} className="space-y-1 text-xs text-muted-foreground">
            {t.goals[key]}
            <Input
              type="number"
              min={0}
              value={values[key] ?? ''}
              onChange={(e) => setValues({ ...values, [key]: Math.round(Number(e.target.value)) })}
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>{t.goals.cancel}</Button>
        <Button type="submit" disabled={saving}>{t.goals.save}</Button>
      </div>
    </form>
  );
}
