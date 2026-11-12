import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { loginSchema } from '@repo/shared';
import { Button, ErrorBox, PasswordField, Segmented, TextField, type IconName, type InputRef } from '@/components/ui';
import { ApiError, forgotPassword } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useKeyboardHeight } from '@/lib/keyboard';
import { radius, space, useColors } from '@/lib/theme';

type Mode = 'login' | 'register' | 'forgot';

const MIN_PASSWORD = 10;
const FEATURE_ICONS: IconName[] = ['camera-outline', 'server-outline', 'flag-outline'];

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { t, locale, setLocale, errorMessage } = useI18n();
  const auth = useAuth();
  const passwordRef = useRef<InputRef>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // O formulário fica na parte de baixo: com o teclado aberto, sobe até ficar visível.
  const keyboardHeight = useKeyboardHeight();
  const revealForm = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  useEffect(() => {
    // Espera pelo novo padding antes de fazer scroll.
    if (keyboardHeight > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [keyboardHeight]);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isLogin = mode === 'login';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSentTo(null);
  }

  function validate(): string | null {
    if (!loginSchema.shape.email.safeParse(email).success) return t.auth.invalidEmail;
    if (mode === 'forgot') return null;
    if (!password) return t.auth.passwordRequired;
    if (!isLogin && password.length < MIN_PASSWORD) return t.auth.passwordTooShort;
    return null;
  }

  /** Erros da API com mensagem específica de cada modo; o resto vai para o tradutor genérico. */
  function describe(err: unknown) {
    if (err instanceof ApiError && locale !== 'pt') {
      if (err.status === 401) return t.auth.wrongCredentials;
      if (err.status === 409) return t.auth.emailTaken;
      if (err.status === 403) return t.auth.registrationDisabled;
    }
    return errorMessage(err);
  }

  async function submit() {
    const invalid = validate();
    if (invalid) return setError(invalid);
    setSubmitting(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === 'forgot') {
        await forgotPassword(cleanEmail, locale);
        setSentTo(cleanEmail);
      } else {
        const input = { email: cleanEmail, password };
        await (isLogin ? auth.login(input) : auth.register(input));
        // O Stack.Protected leva para a app sozinho.
      }
    } catch (err) {
      setError(describe(err));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl + keyboardHeight }}
      >
        {/* Painel verde: o que a app faz. */}
        <View style={[styles.hero, { backgroundColor: c.primary, paddingTop: insets.top + space.lg }]}>
          <View style={styles.heroTop}>
            <View style={styles.logo}>
              <Ionicons name="nutrition" size={22} color={c.primary} />
            </View>
            <Text style={[styles.brand, { color: c.primaryFg }]}>Calorie Tracker</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={locale === 'pt' ? 'Switch to English' : 'Mudar para português'}
              onPress={() => setLocale(locale === 'pt' ? 'en' : 'pt')}
              hitSlop={8}
              style={styles.langPill}
            >
              <Text style={[styles.langText, { color: c.primaryFg }]}>{locale === 'pt' ? 'EN' : 'PT'}</Text>
            </Pressable>
          </View>
          <Text style={[styles.heroTitle, { color: c.primaryFg }]}>{t.auth.heroTitle}</Text>
          <View style={{ gap: 10 }}>
            {t.auth.features.map((feature, i) => (
              <View key={feature} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Ionicons name={FEATURE_ICONS[i]!} size={14} color={c.primaryFg} />
                </View>
                <Text style={[styles.featureText, { color: c.primaryFg }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.form,
            // Largura do ecrã menos as margens; em tablets, no máximo 480.
            { backgroundColor: c.card, borderColor: c.border, width: Math.min(windowWidth - space.lg * 2, 480) },
          ]}
        >
          {mode === 'forgot' && sentTo ? (
            <View style={{ alignItems: 'center', gap: space.md }}>
              <View style={[styles.sentIcon, { backgroundColor: c.primarySoft }]}>
                <Ionicons name="mail-open-outline" size={28} color={c.primary} />
              </View>
              <Text style={[styles.title, { color: c.text }]}>{t.auth.forgotSentTitle}</Text>
              <Text style={[styles.description, { color: c.muted, textAlign: 'center' }]}>{t.auth.forgotSent(sentTo)}</Text>
              <Button variant="ghost" icon="arrow-back" title={t.auth.backToLogin} onPress={() => switchMode('login')} />
            </View>
          ) : (
            <>
              {mode !== 'forgot' && (
                <Segmented
                  value={mode}
                  onChange={switchMode}
                  options={[
                    { value: 'login', label: t.auth.login },
                    { value: 'register', label: t.auth.register },
                  ]}
                />
              )}

              <View style={{ gap: 4 }}>
                <Text style={[styles.title, { color: c.text }]}>
                  {mode === 'forgot' ? t.auth.forgotTitle : isLogin ? t.auth.loginTitle : t.auth.registerTitle}
                </Text>
                <Text style={[styles.description, { color: c.muted }]}>
                  {mode === 'forgot'
                    ? t.auth.forgotDescription
                    : isLogin
                      ? t.auth.loginDescription
                      : t.auth.registerDescription}
                </Text>
              </View>

              <TextField
                label={t.auth.email}
                icon="mail-outline"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                onFocus={revealForm}
                returnKeyType={mode === 'forgot' ? 'send' : 'next'}
                onSubmitEditing={() => (mode === 'forgot' ? submit() : passwordRef.current?.focus())}
                invalid={!!error}
              />

              {mode !== 'forgot' && (
                <View style={{ gap: space.sm }}>
                  <PasswordField
                    ref={passwordRef}
                    label={t.auth.password}
                    showLabel={t.auth.showPassword}
                    hideLabel={t.auth.hidePassword}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    textContentType={isLogin ? 'password' : 'newPassword'}
                    onFocus={revealForm}
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    maxLength={128}
                    invalid={!!error}
                  />
                  {isLogin ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => switchMode('forgot')}
                      hitSlop={8}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      <Text style={[styles.link, { color: c.muted }]}>{t.auth.forgotLink}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.rule}>
                      <Ionicons
                        name={password.length >= MIN_PASSWORD ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={password.length >= MIN_PASSWORD ? c.primary : c.muted}
                      />
                      <Text style={{ fontSize: 13, color: password.length >= MIN_PASSWORD ? c.primary : c.muted }}>
                        {t.auth.passwordRule}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {error && <ErrorBox>{error}</ErrorBox>}

              <Button
                size="lg"
                loading={submitting}
                icon={mode === 'forgot' ? 'send-outline' : isLogin ? 'log-in-outline' : 'person-add-outline'}
                title={mode === 'forgot' ? t.auth.forgotSubmit : isLogin ? t.auth.login : t.auth.register}
                onPress={submit}
              />

              {mode === 'forgot' && (
                <Button variant="ghost" icon="arrow-back" title={t.auth.backToLogin} onPress={() => switchMode('login')} />
              )}
            </>
          )}
        </View>
      </ScrollView>
      {/* Faixa verde fixa atrás da barra de estado: o conteúdo que sobe não passa por baixo dos ícones. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: space.xl,
    paddingBottom: 56,
    gap: space.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { flex: 1, fontSize: 17, fontWeight: '700' },
  langPill: {
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: space.sm },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20, opacity: 0.95 },
  form: {
    marginTop: -32,
    alignSelf: 'center',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.xl,
    gap: space.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: { fontSize: 20, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  link: { fontSize: 13, fontWeight: '500' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
