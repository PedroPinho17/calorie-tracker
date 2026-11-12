import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { LoginInput, RegisterInput, UserDto } from '@repo/shared';
import * as api from './api';
import { useI18n } from './i18n';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: UserDto };

type AuthValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Sessão da app. O token vive no SecureStore; aqui só fica quem está autenticado.
 * Se a API responder 401 a meio (sessão expirada ou terminada), volta ao login.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then(
        (user) => !cancelled && setState(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null }),
        // API inacessível ao abrir: mostra o login (que mostra o erro ao tentar entrar).
        () => !cancelled && setState({ status: 'anonymous', user: null }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  // O handler de 401 lê o estado atual por este ref (sem efeitos dentro do setState).
  const status = useRef(state.status);
  useEffect(() => {
    status.current = state.status;
  });

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      if (status.current === 'authenticated') Alert.alert(t.auth.sessionExpired);
      setState({ status: 'anonymous', user: null });
    });
    return () => api.setUnauthorizedHandler(null);
  }, [t]);

  const login = useCallback(async (input: LoginInput) => {
    setState({ status: 'authenticated', user: await api.login(input) });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setState({ status: 'authenticated', user: await api.register(input) });
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth() tem de estar dentro de <AuthProvider>');
  return ctx;
}
