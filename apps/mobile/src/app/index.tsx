import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { INSA_ATTRIBUTION, sumMacros, type DaySummary, type GoalInput, type HistoryDay, type MealDto } from '@repo/shared';
import { Card, IconButton, SectionLabel } from '@/components/ui';
import { KcalRing, MacroInline, MacroTiles, WeekChart } from '@/components/nutrition';
import { SourcesNote, WaterCard, WeightCard } from '@/components/tracking';
import { useGutter } from '@/lib/layout';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, parseISODate, today as getToday } from '@/lib/dates';
import { useDraft } from '@/lib/draft';
import { useI18n } from '@/lib/i18n';
import { radius, space, useColors } from '@/lib/theme';

// Fotos com qualidade 0.6: chegam bem para o Gemini e o upload fica rápido.
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.6, exif: false };

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { t, intlLocale, errorMessage } = useI18n();
  const auth = useAuth();
  const draft = useDraft();

  const today = getToday();
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [week, setWeek] = useState<HistoryDay[] | null>(null);
  const [goal, setGoal] = useState<GoalInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const [dayRes, weekRes, goalRes] = await Promise.allSettled([
      api.getDay(date),
      api.getHistory(getToday()),
      api.getGoal(),
    ]);
    if (dayRes.status === 'fulfilled') setDay(dayRes.value);
    else setError(errorMessage(dayRes.reason));
    setWeek(weekRes.status === 'fulfilled' ? weekRes.value : null);
    setGoal(goalRes.status === 'fulfilled' ? goalRes.value : null);
  }, [date, errorMessage]);

  // Recarrega sempre que o ecrã volta a ficar visível (ex.: depois de guardar uma refeição).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert(t.home.cameraDenied);
    const res = await ImagePicker.launchCameraAsync(PHOTO_OPTIONS);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    draft.startPhoto(date, asset);
    router.push('/meal');
  }

  async function pickFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    draft.startPhoto(date, asset);
    router.push('/meal');
  }

  function scanBarcode() {
    draft.startManual(date);
    router.push({ pathname: '/scan', params: { then: 'meal' } });
  }

  function search() {
    draft.startManual(date);
    router.push({ pathname: '/search', params: { then: 'meal' } });
  }

  function confirmDelete(meal: MealDto) {
    Alert.alert(t.home.deleteConfirm(t.meals[meal.type]), undefined, [
      { text: t.app.cancel, style: 'cancel' },
      {
        text: t.home.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMeal(meal.id);
            await load();
          } catch (err) {
            Alert.alert(errorMessage(err));
          }
        },
      },
    ]);
  }

  const dayLabel =
    date === today
      ? t.home.today
      : date === addDays(today, -1)
        ? t.home.yesterday
        : new Intl.DateTimeFormat(intlLocale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
            parseISODate(date),
          );
  const email = auth.status === 'authenticated' ? auth.user.email : '';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl, paddingHorizontal: gutter },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: c.primary }]}>
            <Ionicons name="nutrition" size={20} color={c.primaryFg} />
          </View>
          <Text style={[styles.brand, { color: c.text }]}>Calorie Tracker</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.app.account}
            onPress={() => router.push('/account')}
            style={[styles.avatar, { backgroundColor: c.primarySoft }]}
          >
            <Text style={[styles.avatarText, { color: c.primary }]}>{email.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Registar refeição */}
        <SectionLabel>{t.home.newMeal}</SectionLabel>
        <Pressable
          accessibilityRole="button"
          onPress={takePhoto}
          style={({ pressed }) => [styles.photoCta, { backgroundColor: c.primary }, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.photoIcon}>
            <Ionicons name="camera" size={24} color={c.primaryFg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.photoTitle, { color: c.primaryFg }]}>{t.home.takePhoto}</Text>
            <Text style={[styles.photoHint, { color: c.primaryFg }]}>{t.home.takePhotoHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.primaryFg} />
        </Pressable>
        <View style={styles.actions}>
          <ActionTile icon="images-outline" label={t.home.gallery} onPress={pickFromGallery} />
          <ActionTile icon="barcode-outline" label={t.home.barcode} onPress={scanBarcode} />
          <ActionTile icon="search-outline" label={t.home.search} onPress={search} />
        </View>

        {/* Resumo do dia */}
        <SectionLabel>{t.home.summary}</SectionLabel>
        <Card>
          <View style={styles.dayNav}>
            <IconButton icon="chevron-back" label={t.home.previousDay} onPress={() => setDate(addDays(date, -1))} />
            <Text style={[styles.dayLabel, { color: c.text }]} numberOfLines={1}>
              {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
            </Text>
            <IconButton
              icon="chevron-forward"
              label={t.home.nextDay}
              disabled={date >= today}
              onPress={() => setDate(addDays(date, 1))}
            />
          </View>

          {error ? (
            <Text style={{ color: c.destructive, textAlign: 'center' }}>{error}</Text>
          ) : !day || day.date !== date ? (
            <ActivityIndicator color={c.primary} style={{ paddingVertical: space.xl }} />
          ) : (
            <>
              <View style={{ alignItems: 'center', gap: space.sm }}>
                <KcalRing kcal={day.total.kcal} goal={goal?.kcal ?? null} />
                {goal && (
                  <Text style={{ fontSize: 14, color: day.total.kcal > goal.kcal ? c.fat : c.muted }}>
                    {day.total.kcal <= goal.kcal
                      ? t.home.remaining(goal.kcal - day.total.kcal)
                      : t.home.over(day.total.kcal - goal.kcal)}
                  </Text>
                )}
              </View>
              <MacroTiles total={day.total} goal={goal} />

              {day.meals.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="restaurant-outline" size={20} color={c.muted} />
                  <Text style={{ color: c.muted, textAlign: 'center' }}>{t.home.empty}</Text>
                </View>
              ) : (
                day.meals.map((meal, i) => (
                  <MealRow
                    key={meal.id}
                    meal={meal}
                    first={i === 0}
                    onOpen={() => router.push({ pathname: '/saved/[id]', params: { id: meal.id, date } })}
                    onDelete={() => confirmDelete(meal)}
                  />
                ))
              )}
            </>
          )}
        </Card>

        <WaterCard date={date} goalMl={goal?.waterMl ?? 2000} />

        {week && (
          <Card>
            <WeekChart days={week} goal={goal} selected={date} onSelect={setDate} />
          </Card>
        )}

        <WeightCard />
        <SourcesNote attribution={INSA_ATTRIBUTION} />
      </ScrollView>
      {/* Faixa fixa atrás da barra de estado: o conteúdo não passa por baixo dos ícones ao fazer scroll. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.background }}
      />
    </View>
  );
}

function ActionTile({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: c.card, borderColor: c.border },
        pressed && { backgroundColor: c.mutedBg },
      ]}
    >
      <Ionicons name={icon} size={22} color={c.primary} />
      <Text numberOfLines={1} style={[styles.actionLabel, { color: c.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MealRow({
  meal,
  first,
  onOpen,
  onDelete,
}: {
  meal: MealDto;
  first: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const { t, intlLocale } = useI18n();
  const total = sumMacros(meal.items);
  const time = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(new Date(meal.createdAt));
  const foods = meal.items.map((i) => i.food.name).join(' · ');

  return (
    <View style={[styles.mealRow, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
      {/* Tocar na refeição abre-a para trocar alimentos ou corrigir as gramas. */}
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.saved.swap}
        onPress={onOpen}
        style={({ pressed }) => [{ flex: 1, gap: 3 }, pressed && { opacity: 0.6 }]}
      >
        <View style={styles.mealHead}>
          <Text style={[styles.mealTitle, { color: c.text }]}>{t.meals[meal.type]}</Text>
          <Text style={{ fontSize: 12, color: c.muted }}>{time}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 13, color: c.muted }}>
          {foods}
        </Text>
        <MacroInline macros={total} />
      </Pressable>
      <Text style={[styles.mealKcal, { color: c.text }]}>
        {total.kcal}
        <Text style={{ fontSize: 12, fontWeight: '400', color: c.muted }}> kcal</Text>
      </Text>
      <IconButton icon="trash-outline" label={t.home.deleteMeal} color={c.muted} onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.sm },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  photoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  photoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: { fontSize: 17, fontWeight: '700' },
  photoHint: { fontSize: 13, opacity: 0.9, marginTop: 2 },
  actions: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { fontSize: 13, fontWeight: '500' },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -8, marginTop: -8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: space.md },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md },
  mealHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  mealTitle: { fontSize: 15, fontWeight: '600' },
  mealKcal: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
