import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Segmented } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n, type Locale } from '@/lib/i18n';
import { radius, space, useColors } from '@/lib/theme';

/** Folha da conta: email, língua, metas e terminar sessão. */
export default function AccountSheet() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useI18n();
  const auth = useAuth();
  const email = auth.status === 'authenticated' ? auth.user.email : '';

  function logout() {
    Alert.alert(t.app.logoutConfirm, undefined, [
      { text: t.app.cancel, style: 'cancel' },
      // O Stack.Protected leva ao login sozinho quando a sessão termina.
      { text: t.app.logout, style: 'destructive', onPress: () => void auth.logout() },
    ]);
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
          <Text style={[styles.avatarText, { color: c.primary }]}>{email.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t.app.account}
          </Text>
          <Text numberOfLines={1} style={[styles.email, { color: c.text }]}>
            {email}
          </Text>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={[styles.label, { color: c.muted }]}>{t.app.language}</Text>
        <Segmented<Locale>
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'pt', label: 'Português' },
            { value: 'en', label: 'English' },
          ]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          router.back();
          router.push('/goals');
        }}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.mutedBg : c.background, borderColor: c.border }]}
      >
        <Ionicons name="flag-outline" size={19} color={c.primary} />
        <Text style={[styles.rowText, { color: c.text }]}>{t.app.goals}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>

      <Button variant="destructive" icon="log-out-outline" title={t.app.logout} onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500' },
});
