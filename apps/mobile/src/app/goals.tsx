import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goalSchema, type GoalInput } from '@repo/shared';
import { Button, ErrorBox, TextField, type IconName } from '@/components/ui';
import { getGoal, updateGoal } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useKeyboardHeight } from '@/lib/keyboard';
import { useGutter } from '@/lib/layout';
import { space, useColors } from '@/lib/theme';

const FIELDS: { key: keyof GoalInput; icon: IconName }[] = [
  { key: 'kcal', icon: 'flame-outline' },
  { key: 'protein', icon: 'fish-outline' },
  { key: 'carbs', icon: 'leaf-outline' },
  { key: 'fat', icon: 'nutrition-outline' },
  { key: 'waterMl', icon: 'water-outline' },
];

/** Metas diárias de kcal e macros (validadas com o mesmo schema que a API). */
export default function GoalsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t, errorMessage } = useI18n();
  const [values, setValues] = useState<Record<keyof GoalInput, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const gutter = useGutter();

  useEffect(() => {
    getGoal().then(
      (g) =>
        setValues({
          kcal: String(g.kcal),
          protein: String(g.protein),
          carbs: String(g.carbs),
          fat: String(g.fat),
          waterMl: String(g.waterMl ?? 2000),
        }),
      (err) => setError(errorMessage(err)),
    );
  }, [errorMessage]);

  async function save() {
    if (!values) return;
    const parsed = goalSchema.safeParse({
      kcal: Number(values.kcal),
      protein: Number(values.protein),
      carbs: Number(values.carbs),
      fat: Number(values.fat),
      waterMl: Number(values.waterMl),
    });
    if (!parsed.success) return setError(t.goals.invalid);
    setSaving(true);
    setError(null);
    try {
      await updateGoal(parsed.data);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return error ? (
      <ScrollView contentContainerStyle={styles.content}>
        <ErrorBox>{error}</ErrorBox>
      </ScrollView>
    ) : (
      <ActivityIndicator color={c.primary} style={{ marginTop: space.xl }} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xl + keyboardHeight },
        ]}
      >
        {FIELDS.map(({ key, icon }) => (
          <TextField
            key={key}
            label={t.goals[key]}
            icon={icon}
            value={values[key]}
            onChangeText={(v) => setValues({ ...values, [key]: v.replace(/[^0-9]/g, '').slice(0, 5) })}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        ))}
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button size="lg" icon="checkmark" title={t.goals.save} loading={saving} onPress={save} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
});
