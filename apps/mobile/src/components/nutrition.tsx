import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { GoalInput, HistoryDay, Macros } from '@repo/shared';
import { parseISODate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { radius, space, useColors, type Colors } from '@/lib/theme';

const MACROS = ['protein', 'carbs', 'fat'] as const;
const macroColor = (c: Colors, key: (typeof MACROS)[number]) => c[key];

/** Anel de progresso das kcal face à meta (vermelho quando passa). */
export function KcalRing({ kcal, goal, size = 156 }: { kcal: number; goal: number | null; size?: number }) {
  const c = useColors();
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = goal ? Math.min(kcal / goal, 1) : 0;
  const over = goal !== null && kcal > goal;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={goal ? `${kcal} / ${goal} kcal` : `${kcal} kcal`}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.mutedBg} strokeWidth={stroke} />
        {pct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? c.fat : c.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
          />
        )}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, { color: c.text }]}>{kcal}</Text>
          <Text style={[styles.ringGoal, { color: c.muted }]}>{goal ? `/ ${goal} kcal` : 'kcal'}</Text>
        </View>
      </View>
    </View>
  );
}

/** Três cartões: proteína, hidratos e gordura (com barra de progresso se houver meta). */
export function MacroTiles({ total, goal }: { total: Macros; goal?: GoalInput | null }) {
  const c = useColors();
  const { t } = useI18n();
  return (
    <View style={styles.tiles}>
      {MACROS.map((key) => {
        const target = goal?.[key];
        const pct = target ? Math.min(100, (total[key] / target) * 100) : 0;
        return (
          <View key={key} style={[styles.tile, { backgroundColor: c.mutedBg }]}>
            <View style={styles.tileLabelRow}>
              <View style={[styles.dot, { backgroundColor: macroColor(c, key) }]} />
              <Text numberOfLines={1} style={[styles.tileLabel, { color: c.muted }]}>
                {t.macros[key]}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.tileValue, { color: c.text }]}>
              {total[key]}
              <Text style={[styles.tileTarget, { color: c.muted }]}>{target ? ` / ${target} g` : ' g'}</Text>
            </Text>
            {target ? (
              <View style={[styles.track, { backgroundColor: c.border }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: macroColor(c, key) }]} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Linha compacta "● 12 g ● 30 g ● 5 g" para listas. */
export function MacroInline({ macros }: { macros: Macros }) {
  const c = useColors();
  const { t } = useI18n();
  return (
    <View style={styles.inline}>
      {MACROS.map((key) => (
        <View key={key} style={styles.inlineItem} accessible accessibilityLabel={`${t.macros[key]} ${macros[key]} g`}>
          <View style={[styles.dotSm, { backgroundColor: macroColor(c, key) }]} />
          <Text style={[styles.inlineText, { color: c.muted }]}>{macros[key]} g</Text>
        </View>
      ))}
    </View>
  );
}

/** Barras dos últimos 7 dias; tocar num dia abre-o no resumo. */
export function WeekChart({
  days,
  goal,
  selected,
  onSelect,
}: {
  days: HistoryDay[];
  goal: GoalInput | null;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const c = useColors();
  const { t, intlLocale } = useI18n();
  const max = Math.max(goal?.kcal ?? 0, ...days.map((d) => d.total.kcal), 1) * 1.1;
  const logged = days.filter((d) => d.total.kcal > 0);
  const average = logged.length ? Math.round(logged.reduce((s, d) => s + d.total.kcal, 0) / logged.length) : null;
  const weekday = (iso: string, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(intlLocale, { weekday: style }).format(parseISODate(iso)).replace('.', '');
  const CHART_HEIGHT = 96;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.weekHeader}>
        <Text style={[styles.weekTitle, { color: c.text }]}>{t.home.week}</Text>
        <Text style={[styles.weekMeta, { color: c.muted }]}>
          {[average !== null ? t.home.average(average) : null, goal ? t.home.goal(goal.kcal) : null]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
      </View>
      <View style={styles.bars}>
        {goal && (
          <View
            pointerEvents="none"
            style={[styles.goalLine, { bottom: 22 + (goal.kcal / max) * CHART_HEIGHT, borderColor: c.muted }]}
          />
        )}
        {days.map((d) => {
          const isSelected = d.date === selected;
          const over = goal ? d.total.kcal > goal.kcal : false;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${weekday(d.date, 'long')}: ${d.total.kcal} kcal`}
              onPress={() => onSelect(d.date)}
              style={styles.barColumn}
            >
              <Text
                numberOfLines={1}
                style={[styles.barValue, { color: isSelected ? c.text : c.muted, fontWeight: isSelected ? '600' : '400' }]}
              >
                {d.total.kcal > 0 ? d.total.kcal : ''}
              </Text>
              <View style={[styles.barTrack, { height: CHART_HEIGHT, backgroundColor: c.mutedBg }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(d.total.kcal / max) * 100}%`,
                      backgroundColor: over ? c.fat : c.primary,
                      opacity: isSelected ? 1 : 0.45,
                    },
                  ]}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.barLabel, { color: isSelected ? c.text : c.muted, fontWeight: isSelected ? '600' : '400' }]}
              >
                {weekday(d.date, 'short').slice(0, 3)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  ringGoal: { fontSize: 13, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, borderRadius: radius.md, padding: space.md, gap: 4 },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontSize: 12, flexShrink: 1 },
  tileValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileTarget: { fontSize: 12, fontWeight: '400' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSm: { width: 6, height: 6, borderRadius: 3 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md },
  inlineItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineText: { fontSize: 12, fontVariant: ['tabular-nums'] },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  weekTitle: { fontSize: 15, fontWeight: '600' },
  weekMeta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  bars: { flexDirection: 'row', gap: 6, position: 'relative' },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', zIndex: 1 },
  barColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, height: 14, fontVariant: ['tabular-nums'] },
  barTrack: { width: '100%', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 12, textTransform: 'capitalize' },
});
