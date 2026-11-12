import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { PickedFood, RecentFood } from '@repo/shared';
import { TextField } from '@/components/ui';
import { confirmFood, foodByBarcode, getRecent, searchFoods, updateMealItem } from '@/lib/api';
import { useGutter } from '@/lib/layout';
import { useDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { space, useColors } from '@/lib/theme';

const BARCODE = /^\d{8,14}$/;

/**
 * Pesquisa de alimentos (INSA, USDA) ou por código de barras escrito à mão.
 * Parâmetros: then = 'meal' (abre o editor a seguir) | 'back' (volta ao editor);
 *             replace = id do alimento do rascunho a corrigir; q = pesquisa inicial;
 *             mode = 'saved' + mealId + itemId → troca o alimento numa refeição já guardada.
 */
export default function SearchScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { t, errorMessage } = useI18n();
  const draft = useDraft();
  const params = useLocalSearchParams<{
    then?: string;
    replace?: string;
    q?: string;
    mode?: string;
    mealId?: string;
    itemId?: string;
  }>();
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState(params.q ?? '');
  const [recent, setRecent] = useState<RecentFood[]>([]);
  // O resultado guarda a pesquisa a que responde: se a pesquisa atual for outra, está a carregar.
  const [result, setResult] = useState<{ q: string; foods: PickedFood[]; error: string | null } | null>(null);
  const q = query.trim();
  const active = q.length >= 2;
  const current = active && result?.q === q ? result : null;
  const loading = active && !current;
  const results = current?.foods ?? [];
  const error = current?.error ?? null;

  useEffect(() => {
    getRecent().then(setRecent, () => setRecent([]));
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // Espera que se pare de escrever (debounce) antes de pesquisar.
    const timer = setTimeout(async () => {
      try {
        const foods = BARCODE.test(q) ? [await foodByBarcode(q)] : await searchFoods(q);
        if (!cancelled) setResult({ q, foods, error: null });
      } catch (err) {
        if (!cancelled) setResult({ q, foods: [], error: errorMessage(err) });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active, errorMessage]);

  async function pick(food: PickedFood, grams?: number) {
    // Refeição já guardada: a troca é feita no servidor (que recalcula os macros).
    if (params.mode === 'saved' && params.mealId && params.itemId) {
      setSaving(true);
      try {
        await updateMealItem(params.mealId, params.itemId, { picked: food });
        router.back();
      } catch (err) {
        Alert.alert(t.saved.updateFailed, errorMessage(err));
      } finally {
        setSaving(false);
      }
      return;
    }

    const target = params.replace ? draft.items.find((it) => it.id === params.replace) : undefined;
    if (target) {
      draft.replaceFood(target.id, food);
      // Ensina a API: da próxima vez que o Gemini disser este nome, usa este alimento.
      if (!target.manual) confirmFood(target.name, food).catch(() => {});
    } else {
      draft.addFood(food, grams);
    }
    if (params.then === 'meal') router.replace('/meal');
    else router.back();
  }

  const showRecent = !active && recent.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.searchBox, { paddingHorizontal: gutter }]}>
        <TextField
          label={t.search.title}
          labelHidden
          icon="search-outline"
          placeholder={t.search.placeholder}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          trailing={loading || saving ? <ActivityIndicator size="small" color={c.muted} /> : null}
        />
      </View>

      <FlatList<PickedFood | RecentFood>
        data={showRecent ? recent : results}
        keyExtractor={(item) => ('food' in item ? `r-${item.food.source}-${item.food.externalId}` : `${item.source}-${item.externalId}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        ListHeaderComponent={
          showRecent ? (
            <View style={styles.listHeader}>
              <Ionicons name="time-outline" size={14} color={c.muted} />
              <Text style={{ fontSize: 13, color: c.muted }}>{t.search.recent}</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          error ? (
            <Text style={[styles.empty, { color: c.destructive }]}>{error}</Text>
          ) : !active ? (
            <Text style={[styles.empty, { color: c.muted }]}>{t.search.hint}</Text>
          ) : !loading ? (
            <Text style={[styles.empty, { color: c.muted }]}>{t.search.noResults}</Text>
          ) : undefined
        }
        renderItem={({ item }) => {
          const food = 'food' in item ? item.food : item;
          const grams = 'food' in item ? item.grams : undefined;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void pick(food, grams)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: c.border, paddingHorizontal: gutter },
                pressed && { backgroundColor: c.mutedBg },
              ]}
            >
              <Text numberOfLines={2} style={[styles.name, { color: c.text }]}>
                {food.name}
                {food.source === 'insa' ? <Text style={{ fontSize: 11, color: c.muted }}>  · INSA</Text> : null}
              </Text>
              <Text style={[styles.meta, { color: c.muted }]}>
                {grams ? `${grams} g` : `${Math.round(food.kcalPer100g)} kcal/100 g`}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { padding: space.lg, paddingBottom: space.sm },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 15 },
  meta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', padding: space.xl, fontSize: 14 },
});
