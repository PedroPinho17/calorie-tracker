import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOW_CONFIDENCE, MEAL_TYPES, scaleMacros, sumMacros, type MealType } from '@repo/shared';
import { Button, Card, ErrorBox, IconButton, SectionLabel } from '@/components/ui';
import { MacroInline, MacroTiles } from '@/components/nutrition';
import { saveMeal } from '@/lib/api';
import { guessMealType } from '@/lib/dates';
import { useDraft, type DraftItem } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { useKeyboardHeight } from '@/lib/keyboard';
import { useGutter } from '@/lib/layout';
import { radius, space, useColors } from '@/lib/theme';

const MAX_GRAMS = 5000;

export default function MealScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t, errorMessage } = useI18n();
  const draft = useDraft();
  const [mealType, setMealType] = useState<MealType>(() => guessMealType());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const gutter = useGutter();

  const total = useMemo(
    () => sumMacros(draft.items.map((it) => (it.food ? scaleMacros(it.food, it.grams) : {}))),
    [draft.items],
  );
  const savable = draft.items.filter((it) => it.food && it.grams > 0);
  const unmatched = draft.items.length - savable.length;
  const analyzing = draft.status === 'analyzing';

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveMeal({
        date: draft.date,
        type: mealType,
        items: savable.map((it) => ({ grams: it.grams, picked: it.food! })),
      });
      draft.reset();
      router.back(); // o resumo recarrega ao voltar
    } catch (err) {
      setError(`${t.meal.saveFailed}: ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter, paddingBottom: space.xl + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
      >
        {draft.photoUri && (
          <View style={styles.photoWrap}>
            <Image source={{ uri: draft.photoUri }} style={styles.photo} accessibilityIgnoresInvertColors />
            {analyzing && (
              <View style={[StyleSheet.absoluteFill, styles.photoOverlay, { backgroundColor: c.overlay }]}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.overlayText}>{t.meal.analyzing}</Text>
              </View>
            )}
          </View>
        )}

        {draft.status === 'error' && (
          <Card>
            <ErrorBox>
              {t.meal.analyzeFailed}: {errorMessage(draft.error)}
            </ErrorBox>
            <Button variant="secondary" icon="refresh" title={t.meal.retry} onPress={draft.retryAnalysis} />
          </Card>
        )}

        {!analyzing && draft.items.length > 0 && (
          <Card>
            <View style={styles.totalRow}>
              <View>
                <Text style={{ fontSize: 13, color: c.muted }}>{t.meal.estimatedTotal}</Text>
                <Text style={[styles.totalValue, { color: c.text }]}>
                  {total.kcal}
                  <Text style={{ fontSize: 15, fontWeight: '400', color: c.muted }}> kcal</Text>
                </Text>
              </View>
              <View style={[styles.flame, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                <Ionicons name="flame" size={22} color="#f97316" />
              </View>
            </View>
            <MacroTiles total={total} />
          </Card>
        )}

        {!analyzing && draft.status !== 'error' && (
          <>
            <SectionLabel>
              {t.meal.foods} ({draft.items.length})
            </SectionLabel>
            <Card style={{ gap: 0, paddingVertical: space.sm }}>
              {draft.items.length === 0 && draft.photoUri && (
                <Text style={{ color: c.muted, paddingVertical: space.md }}>{t.meal.noneFound}</Text>
              )}
              {draft.items.map((item, i) => (
                <FoodRow key={item.id} item={item} first={i === 0} />
              ))}
              <View style={[styles.addRow, draft.items.length > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                <Button
                  variant="secondary"
                  icon="search-outline"
                  title={t.meal.addFood}
                  style={{ flex: 1 }}
                  onPress={() => router.push({ pathname: '/search', params: { then: 'back' } })}
                />
                <Button
                  variant="secondary"
                  icon="barcode-outline"
                  title={t.home.barcode}
                  style={{ flex: 1 }}
                  onPress={() => router.push({ pathname: '/scan', params: { then: 'back' } })}
                />
              </View>
            </Card>

            <SectionLabel>{t.meal.mealType}</SectionLabel>
            <View style={styles.types}>
              {MEAL_TYPES.map((type) => {
                const selected = type === mealType;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setMealType(type)}
                    style={[
                      styles.typeChip,
                      { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card },
                    ]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: selected ? '600' : '500', color: selected ? c.primary : c.text }}>
                      {t.meals[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {unmatched > 0 && <Text style={{ fontSize: 13, color: c.muted }}>{t.meal.unmatched(unmatched)}</Text>}
            <Text style={[styles.source, { color: c.muted }]}>
              {draft.photoUri ? t.meal.sourcePhoto : t.meal.sourceManual}
            </Text>
          </>
        )}
      </ScrollView>

      {/* Ação principal sempre visível no fundo. */}
      {!analyzing && draft.status !== 'error' && keyboardHeight === 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + space.md, paddingHorizontal: gutter },
          ]}
        >
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button
            size="lg"
            icon="checkmark"
            title={t.meal.save}
            loading={saving}
            disabled={savable.length === 0}
            onPress={save}
          />
        </View>
      )}
    </View>
  );
}

function FoodRow({ item, first }: { item: DraftItem; first: boolean }) {
  const c = useColors();
  const { t } = useI18n();
  const draft = useDraft();
  const [text, setText] = useState(String(item.grams));
  const macros = item.food ? scaleMacros(item.food, item.grams) : null;

  function onGrams(value: string) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    setText(digits);
    draft.setGrams(item.id, Math.min(MAX_GRAMS, Number(digits) || 0));
  }

  function remove() {
    Alert.alert(t.meal.remove, item.food?.name ?? item.name, [
      { text: t.app.cancel, style: 'cancel' },
      { text: t.meal.remove, style: 'destructive', onPress: () => draft.removeItem(item.id) },
    ]);
  }

  // Título: o que o Gemini viu (em PT, ex.: "Francesinha"). Por baixo, o alimento da base de dados
  // usado para os macros — assim uma correspondência errada vê-se logo e corrige-se.
  // Itens adicionados à mão já são o próprio alimento.
  const name = item.manual ? (item.food?.name ?? item.name) : item.name;
  const matched = item.food && item.food.name.toLowerCase() !== name.toLowerCase() ? item.food.name : null;

  return (
    <View style={[styles.foodRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
      {/* Tocar no nome abre a pesquisa para corrigir o alimento. */}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.meal.noMatch}
        style={{ flex: 1, gap: 3 }}
        onPress={() =>
          router.push({ pathname: '/search', params: { then: 'back', replace: item.id, q: item.name } })
        }
      >
        <View style={styles.foodTitleRow}>
          <Text numberOfLines={2} style={[styles.foodName, { color: c.text }]}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Text>
          {item.learned && (
            <View style={[styles.badge, { backgroundColor: c.mutedBg }]}>
              <Text style={{ fontSize: 11, color: c.muted }}>{t.meal.learned}</Text>
            </View>
          )}
          {item.food?.source === 'insa' && (
            <View style={[styles.badge, { backgroundColor: c.mutedBg }]}>
              <Text style={{ fontSize: 11, color: c.muted }}>INSA</Text>
            </View>
          )}
          {item.food && item.confidence !== null && item.confidence < LOW_CONFIDENCE && (
            <View
              accessibilityLabel={t.meal.lowConfidence}
              style={[styles.badge, { borderWidth: 1, borderColor: c.carbs }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.carbs }}>{t.meal.confirm}</Text>
            </View>
          )}
        </View>
        {matched && (
          <Text numberOfLines={1} style={{ fontSize: 12, color: c.muted }}>
            → {matched}
          </Text>
        )}
        {macros ? (
          <MacroInline macros={macros} />
        ) : (
          <Text style={{ fontSize: 12, color: c.destructive }}>{t.meal.noMatch}</Text>
        )}
      </Pressable>

      <View style={[styles.gramsBox, { borderColor: c.border, backgroundColor: c.mutedBg }]}>
        <TextInput
          accessibilityLabel={`${name} (g)`}
          value={text}
          onChangeText={onGrams}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.gramsInput, { color: c.text }]}
        />
        <Text style={{ color: c.muted, fontSize: 13 }}>g</Text>
      </View>
      <Text style={[styles.foodKcal, { color: c.text }]}>{macros ? macros.kcal : '–'}</Text>
      <IconButton icon="close" label={t.meal.remove} color={c.muted} onPress={remove} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  photoWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoOverlay: { alignItems: 'center', justifyContent: 'center', gap: space.sm },
  overlayText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  totalValue: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  flame: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  foodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  foodName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  gramsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  gramsInput: { width: 44, textAlign: 'right', fontSize: 15, paddingVertical: 6, fontVariant: ['tabular-nums'] },
  foodKcal: { width: 40, textAlign: 'right', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  addRow: { flexDirection: 'row', gap: space.sm, paddingTop: space.md, paddingBottom: space.sm },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  typeChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, justifyContent: 'center' },
  source: { fontSize: 12, textAlign: 'center', marginTop: space.sm },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
});
