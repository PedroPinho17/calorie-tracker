import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { sumMacros, type MealDto } from '@repo/shared';
import { Card, ErrorBox, IconButton } from '@/components/ui';
import { MacroInline, MacroTiles } from '@/components/nutrition';
import * as api from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useKeyboardHeight } from '@/lib/keyboard';
import { useGutter } from '@/lib/layout';
import { radius, space, useColors } from '@/lib/theme';

/**
 * Refeição já guardada: macros de cada alimento, gramas editáveis e "trocar alimento"
 * (abre a pesquisa; a troca é feita no servidor, que recalcula os macros).
 * Parâmetros: id (da refeição) e date (dia da refeição).
 */
export default function SavedMealScreen() {
  const c = useColors();
  const gutter = useGutter();
  const keyboardHeight = useKeyboardHeight();
  const { t, intlLocale, errorMessage } = useI18n();
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const [meal, setMeal] = useState<MealDto | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Recarrega ao voltar da pesquisa (depois de trocar um alimento).
  useFocusEffect(
    useCallback(() => {
      api.getDay(date).then(
        (day) => setMeal(day.meals.find((m) => m.id === id) ?? null),
        (err) => setError(errorMessage(err)),
      );
    }, [id, date, errorMessage]),
  );

  if (error) return <View style={{ padding: gutter }}><ErrorBox>{error}</ErrorBox></View>;
  if (meal === undefined) return <ActivityIndicator color={c.primary} style={{ marginTop: space.xl }} />;
  if (meal === null) return <Text style={{ color: c.muted, padding: gutter }}>{t.saved.notFound}</Text>;

  const total = sumMacros(meal.items);
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(new Date(meal.createdAt));

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: gutter, paddingVertical: space.lg, gap: space.md, paddingBottom: space.xl + keyboardHeight }}
    >
      <Stack.Screen options={{ title: `${t.meals[meal.type]} · ${time}` }} />
      <Card>
        <Text style={[styles.total, { color: c.text }]}>
          {total.kcal}
          <Text style={{ fontSize: 15, fontWeight: '400', color: c.muted }}> kcal</Text>
        </Text>
        <MacroTiles total={total} />
      </Card>

      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        {meal.items.map((item, i) => (
          <SavedItem key={item.id} mealId={meal.id} item={item} first={i === 0} onUpdated={setMeal} />
        ))}
      </Card>
    </ScrollView>
  );
}

function SavedItem({
  mealId,
  item,
  first,
  onUpdated,
}: {
  mealId: string;
  item: MealDto['items'][number];
  first: boolean;
  onUpdated: (meal: MealDto) => void;
}) {
  const c = useColors();
  const { t, errorMessage } = useI18n();
  const [grams, setGrams] = useState(String(Math.round(item.grams)));
  const [saving, setSaving] = useState(false);

  async function commitGrams() {
    const value = Math.min(5000, Math.max(1, Number(grams) || 0));
    if (!value || value === Math.round(item.grams)) return setGrams(String(Math.round(item.grams)));
    setSaving(true);
    try {
      onUpdated(await api.updateMealItem(mealId, item.id, { grams: value }));
    } catch (err) {
      Alert.alert(t.saved.updateFailed, errorMessage(err));
      setGrams(String(Math.round(item.grams)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
          {item.food.name}
          {item.food.source === 'insa' ? <Text style={{ fontSize: 11, color: c.muted }}>  · INSA</Text> : null}
        </Text>
        <MacroInline macros={item} />
      </View>
      <View style={[styles.gramsBox, { borderColor: c.border, backgroundColor: c.mutedBg }]}>
        <TextInput
          accessibilityLabel={`${item.food.name} (g)`}
          value={grams}
          editable={!saving}
          onChangeText={(v) => setGrams(v.replace(/[^0-9]/g, '').slice(0, 4))}
          onEndEditing={commitGrams}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.gramsInput, { color: c.text }]}
        />
        <Text style={{ color: c.muted, fontSize: 13 }}>g</Text>
      </View>
      <Text style={[styles.kcal, { color: c.text }]}>{item.kcal}</Text>
      {saving ? (
        <ActivityIndicator color={c.primary} style={{ width: 44 }} />
      ) : (
        <IconButton
          icon="swap-horizontal"
          label={t.saved.swap}
          color={c.primary}
          onPress={() =>
            router.push({
              pathname: '/search',
              params: { mode: 'saved', mealId, itemId: item.id, q: item.food.name },
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  name: { fontSize: 15, fontWeight: '600' },
  gramsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  gramsInput: { width: 44, textAlign: 'right', fontSize: 15, paddingVertical: 6, fontVariant: ['tabular-nums'] },
  kcal: { width: 40, textAlign: 'right', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
