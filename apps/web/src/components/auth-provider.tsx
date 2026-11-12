'use client';

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { LoginInput, RegisterInput, UserDto } from '@repo/shared';
import * as api from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type AuthState =
  | { status: 'loading'; user: null; error: null }
  /** error: problema ao verificar a sessão (ex.: API em baixo); null = simplesmente sem sessão. */
  | { status: 'anonymous'; user: null; error: unknown }
  | { status: 'authenticated'; user: UserDto; error: null };

type AuthContextValue = AuthState & {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  /** Define a password nova com o token do email e fica autenticado. */
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sabe quem está autenticado. A sessão vive num cookie httpOnly posto pela API
 * (o JavaScript nunca vê o token); aqui só perguntamos GET /auth/me.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, error: null });
  const { t } = useI18n();
  // O listener de 401 é registado uma vez; lê o estado e a língua atuais por este ref.
  const latest = useRef({ status: state.status, message: t.app.sessionExpired });
  useEffect(() => {
    latest.current = { status: state.status, message: t.app.sessionExpired };
  });

  useEffect(() => {
    let cancelled = false;
    api.getMe().then(
      (user) => !cancelled && setState({ status: 'authenticated', user, error: null }),
      (err) =>
        !cancelled &&
        setState({
          status: 'anonymous',
          user: null,
          error: err instanceof api.ApiError && err.status === 401 ? null : err,
        }),
    );

    // Se a sessão expirar a meio, qualquer pedido com 401 manda de volta ao login.
    const onUnauthorized = () => {
      // id fixo: vários pedidos a falhar ao mesmo tempo mostram um só aviso.
      if (latest.current.status === 'authenticated') {
        toast.info(latest.current.message, { id: 'session-expired' });
      }
      setState({ status: 'anonymous', user: null, error: null });
    };
    window.addEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const user = await api.login(input);
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await api.register(input);
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const user = await api.resetPassword(token, password);
    setState({ status: 'authenticated', user, error: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ status: 'anonymous', user: null, error: null });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, resetPassword, logout }),
    [state, login, register, resetPassword, logout],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth() tem de estar dentro de <AuthProvider>');
  return ctx;
}
