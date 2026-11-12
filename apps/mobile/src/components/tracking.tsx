import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LineChart } from 'react-native-gifted-charts';
import type { WaterDay, WeightEntry } from '@repo/shared';
import { Button, Card, IconButton } from '@/components/ui';
import * as api from '@/lib/api';
import { parseISODate, today as getToday } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { radius, space, useColors } from '@/lib/theme';

const WATER = '#0ea5e9';
const GLASS_ML = 250;
const BOTTLE_ML = 500;

/** Água do dia: progresso face à meta, copo (+250), garrafa (+500) e desfazer. */
export function WaterCard({ date, goalMl }: { date: string; goalMl: number }) {
  const c = useColors();
  const { t, errorMessage } = useI18n();
  const [result, setResult] = useState<{ date: string; day: WaterDay } | null>(null);
  const [busy, setBusy] = useState(false);
  const day = result?.date === date ? result.day : null;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.getWater(date).then(
        (d) => !cancelled && setResult({ date, day: d }),
        () => !cancelled && setResult({ date, day: { date, totalMl: 0, entries: [] } }),
      );
      return () => {
        cancelled = true;
      };
    }, [date]),
  );

  async function run(action: () => Promise<WaterDay>) {
    setBusy(true);
    try {
      setResult({ date, day: await action() });
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const total = day?.totalMl ?? 0;
  const pct = goalMl > 0 ? Math.min(100, (total / goalMl) * 100) : 0;
  const last = day?.entries.at(-1);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="water" size={18} color={WATER} />
          <Text style={[styles.title, { color: c.text }]}>{t.water.title}</Text>
        </View>
        <IconButton
          icon="arrow-undo-outline"
          label={t.water.undo}
          color={c.muted}
          disabled={!last || busy}
          onPress={() => last && void run(() => api.deleteWater(last.id))}
        />
      </View>
      {!day ? (
        <ActivityIndicator color={WATER} />
      ) : (
        <>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: c.text }]}>
              {total}
              <Text style={{ fontSize: 13, fontWeight: '400', color: c.muted }}> {t.water.of(goalMl)}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: total >= goalMl ? WATER : c.muted }}>
              {total >= goalMl ? t.water.done : t.water.remaining(goalMl - total)}
            </Text>
          </View>
          <View
            style={[styles.track, { backgroundColor: c.mutedBg }]}
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{ now: total, max: goalMl }}
          >
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: WATER }]} />
          </View>
          <View style={styles.buttons}>
            <Button
              variant="secondary"
              icon="beaker-outline"
              title={`${t.water.glass} +${GLASS_ML}`}
              disabled={busy}
              style={{ flex: 1 }}
              onPress={() => void run(() => api.addWater(date, GLASS_ML))}
            />
            <Button
              variant="secondary"
              icon="flask-outline"
              title={`${t.water.bottle} +${BOTTLE_ML}`}
              disabled={busy}
              style={{ flex: 1 }}
              onPress={() => void run(() => api.addWater(date, BOTTLE_ML))}
            />
          </View>
        </>
      )}
    </Card>
  );
}

/** Peso de hoje + gráfico dos últimos 90 dias. */
export function WeightCard() {
  const c = useColors();
  const { t, intlLocale, errorMessage } = useI18n();
  const [entries, setEntries] = useState<WeightEntry[] | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [width, setWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api.getWeights(90).then(setEntries, () => setEntries([]));
    }, []),
  );

  async function save() {
    const kg = Number(value.replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) return Alert.alert(t.weight.invalid);
    setSaving(true);
    try {
      const saved = await api.saveWeight(getToday(), Math.round(kg * 10) / 10);
      setEntries((list) =>
        [...(list ?? []).filter((x) => x.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setValue('');
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const first = entries?.[0];
  const last = entries?.at(-1);
  const spanDays =
    first && last ? Math.round((parseISODate(last.date).getTime() - parseISODate(first.date).getTime()) / 86_400_000) : 0;
  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(parseISODate(iso));

  // Eixo Y a começar perto do peso mínimo (senão a linha fica espalmada no topo).
  const values = entries?.map((e) => e.kg) ?? [];
  const min = values.length ? Math.floor(Math.min(...values) - 1) : 0;
  const max = values.length ? Math.ceil(Math.max(...values) + 1) : 0;
  const labelEvery = Math.max(1, Math.ceil((entries?.length ?? 0) / 4));

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="barbell-outline" size={18} color={c.primary} />
          <Text style={[styles.title, { color: c.text }]}>{t.weight.title}</Text>
        </View>
        {first && last && spanDays > 0 && (
          <Text style={{ fontSize: 12, color: c.muted }}>{t.weight.change(last.kg - first.kg, spanDays)}</Text>
        )}
      </View>

      <View style={styles.weightForm}>
        <TextInput
          value={value}
          onChangeText={(v) => setValue(v.replace(/[^0-9.,]/g, '').slice(0, 5))}
          placeholder={last ? `${t.weight.placeholder} · ${last.kg}` : t.weight.placeholder}
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel={t.weight.placeholder}
          style={[styles.weightInput, { color: c.text, backgroundColor: c.mutedBg, borderColor: c.border }]}
        />
        <Button title={t.weight.save} loading={saving} disabled={!value} onPress={save} />
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {!entries ? (
          <ActivityIndicator color={c.primary} />
        ) : entries.length < 2 ? (
          <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: space.md }}>{t.weight.empty}</Text>
        ) : width > 0 ? (
          <LineChart
            data={entries.map((e, i) => ({
              value: e.kg,
              label: i % labelEvery === 0 ? shortDate(e.date) : '',
            }))}
            width={width - 44}
            height={150}
            adjustToWidth
            initialSpacing={8}
            endSpacing={8}
            curved
            thickness={2.5}
            color={c.primary}
            dataPointsColor={c.primary}
            dataPointsRadius={3}
            areaChart
            startFillColor={c.primary}
            endFillColor={c.primary}
            startOpacity={0.18}
            endOpacity={0.01}
            yAxisOffset={min}
            maxValue={max - min}
            noOfSections={4}
            yAxisLabelWidth={36}
            yAxisColor="transparent"
            xAxisColor={c.border}
            rulesColor={c.border}
            rulesType="solid"
            yAxisTextStyle={{ color: c.muted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: c.muted, fontSize: 10, width: 50 }}
          />
        ) : null}
      </View>
    </Card>
  );
}

/** Citação obrigatória das fontes (condições de utilização da tabela do INSA). */
export function SourcesNote({ attribution }: { attribution: string }) {
  const c = useColors();
  const { t } = useI18n();
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 11, lineHeight: 16, color: c.muted }}>
        {t.sources} {attribution}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  value: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  buttons: { flexDirection: 'row', gap: space.sm },
  weightForm: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  weightInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
