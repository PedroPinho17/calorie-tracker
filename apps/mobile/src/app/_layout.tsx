import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { configError } from '@/lib/config';
import { DraftProvider } from '@/lib/draft';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <DraftProvider>
            <RootStack />
          </DraftProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

/**
 * Sem sessão só existe o ecrã de login; com sessão, o resto. Quando a sessão muda
 * (login, logout, 401 da API), o Stack.Protected redireciona sozinho e limpa o histórico.
 * Nota: isto é só navegação — quem protege os dados é a API (todas as rotas exigem token).
 */
function RootStack() {
  const auth = useAuth();
  const { t } = useI18n();
  const c = useColors();
  const misconfigured = configError();

  if (misconfigured) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.errorTitle, { color: c.text }]}>{t.app.configError}</Text>
        <Text style={{ color: c.muted, textAlign: 'center' }}>{misconfigured}</Text>
      </View>
    );
  }

  if (auth.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const signedIn = auth.status === 'authenticated';

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="meal" options={{ title: t.meal.title }} />
          <Stack.Screen name="saved/[id]" options={{ title: t.saved.title }} />
          <Stack.Screen name="search" options={{ presentation: 'modal', title: t.search.title }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="goals" options={{ presentation: 'modal', title: t.goals.title }} />
          <Stack.Screen
            name="account"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetCornerRadius: 20,
              headerShown: false,
              contentStyle: { backgroundColor: c.card },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
});
