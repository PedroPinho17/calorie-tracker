'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRoundIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { AuthLayout } from '@/components/auth-form';
import {
  FormError,
  MAX_PASSWORD,
  MIN_PASSWORD,
  PasswordField,
  PasswordRule,
} from '@/components/auth-fields';
import { ApiError } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';

const TOKEN_RE = /^[\w-]{43}$/;

// O token vem no fragmento do link (#token=...). É lido uma vez e guardado aqui,
// porque logo a seguir é apagado da barra de endereço e do histórico.
let capturedToken: string | null | undefined;
const noopSubscribe = () => () => {};
const readToken = () =>
  (capturedToken ??= (() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    return token && TOKEN_RE.test(token) ? token : null;
  })());

export function ResetPasswordForm() {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const { resetPassword } = useAuth();
  const router = useRouter();
  // undefined no servidor (não há window); no browser, o token ou null.
  const token = useSyncExternalStore(noopSubscribe, readToken, () => undefined);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (password.length < MIN_PASSWORD) return setError(new Error(t.auth.passwordTooShort));
    if (password.length > MAX_PASSWORD) return setError(new Error(t.auth.passwordTooLong));

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      toast.success(t.auth.resetDone);
      router.replace('/');
    } catch (err) {
      // 400 com password válida = link inválido, expirado ou já usado.
      if (err instanceof ApiError && err.status === 400) setInvalidLink(true);
      else setError(err);
      setSubmitting(false);
    }
  }

  if (token === undefined) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2Icon className="size-6 animate-spin" aria-label={t.app.loading} />
      </div>
    );
  }

  const errorText = !error
    ? null
    : error instanceof ApiError
      ? errorMessage(error)
      : error instanceof Error && error.message
        ? error.message
        : t.errors.generic;

  return (
    <AuthLayout>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRoundIcon className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t.auth.resetTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.auth.resetDescription}</p>
        </div>
      </div>

      {!token || invalidLink ? (
        <div className="space-y-4">
          <FormError>{t.auth.resetInvalid}</FormError>
          <Button size="lg" className="h-11 w-full text-base" onClick={() => router.replace('/')}>
            <RotateCcwIcon /> {t.auth.requestNewLink}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <PasswordField
            label={t.auth.newPassword}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            autoFocus
            minLength={MIN_PASSWORD}
            invalid={!!error}
          />
          <PasswordRule password={password} />
          {errorText && <FormError>{errorText}</FormError>}
          <Button type="submit" size="lg" className="h-11 w-full text-base shadow-sm" disabled={submitting}>
            {submitting ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />}
            {t.auth.resetSubmit}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
