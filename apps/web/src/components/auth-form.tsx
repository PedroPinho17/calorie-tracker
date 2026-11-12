'use client';

import { useState } from 'react';
import {
  ArrowLeftIcon,
  CameraIcon,
  DatabaseIcon,
  FlameIcon,
  Loader2Icon,
  LogInIcon,
  MailCheckIcon,
  MailIcon,
  SendIcon,
  TargetIcon,
  UserPlusIcon,
} from 'lucide-react';
import { loginSchema } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MacroBar, MacroInline } from '@/components/macro-summary';
import { useAuth } from '@/components/auth-provider';
import {
  Field,
  FormError,
  INPUT_CLASS,
  MAX_PASSWORD,
  MIN_PASSWORD,
  PasswordField,
  PasswordRule,
} from '@/components/auth-fields';
import { ApiError, forgotPassword } from '@/lib/api';
import { useErrorMessage, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register' | 'forgot';

const FEATURE_ICONS = [CameraIcon, DatabaseIcon, TargetIcon];
// Exemplo para a pré-visualização: ovos com torrada.
const PREVIEW = { kcal: 412, protein: 21.4, carbs: 33.2, fat: 20.6 };

/** Moldura dos ecrãs de autenticação: manchas de cor, cartão e painel verde. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto max-w-xl">
      {/* Manchas de cor desfocadas atrás do cartão. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-16 -left-20 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-40 -right-24 size-64 rounded-full bg-carbs/25 blur-3xl" />
        <div className="absolute -bottom-16 left-10 size-56 rounded-full bg-protein/20 blur-3xl" />
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-xl shadow-primary/10">
        <Hero />
        <div className="space-y-5 p-6 sm:p-8">{children}</div>
      </Card>
    </div>
  );
}

export function AuthForm({ initialError }: { initialError?: unknown }) {
  return (
    <AuthLayout>
      <FormPanel initialError={initialError} />
    </AuthLayout>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden bg-primary p-6 text-primary-foreground sm:p-8">
      {/* Padrão de pontos + círculos decorativos. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div aria-hidden className="absolute -top-20 -right-16 size-56 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-24 -left-10 size-48 rounded-full bg-black/5" />

      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase opacity-80">
              {t.auth.heroEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {t.auth.heroTitle}
            </h2>
          </div>
          <ul className="space-y-2 text-sm">
            {t.auth.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[i]!;
              return (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md bg-white/15">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="opacity-95">{feature}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pré-visualização do que a app mostra depois de analisar uma foto. */}
        <div
          aria-hidden
          className="mx-auto w-full max-w-60 rotate-2 rounded-xl bg-card p-4 text-card-foreground shadow-lg ring-1 ring-black/5 sm:w-52"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t.auth.previewMeal}</p>
            <span className="flex size-7 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
              <FlameIcon className="size-4" />
            </span>
          </div>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {PREVIEW.kcal}
            <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
          </p>
          <MacroBar total={PREVIEW} className="mt-3 h-2" />
          <MacroInline macros={PREVIEW} className="mt-2 text-xs text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function FormPanel({ initialError }: { initialError?: unknown }) {
  const { login, register } = useAuth();
  const { t, locale } = useI18n();
  const errorMessage = useErrorMessage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);
  /** Email para o qual já se pediu o link (mostra o ecrã "Vê o teu email"). */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isLogin = mode === 'login';

  function validate(): string | null {
    if (!loginSchema.shape.email.safeParse(email).success) return t.auth.invalidEmail;
    if (mode === 'forgot') return null;
    if (!password) return t.auth.passwordRequired;
    if (!isLogin && password.length < MIN_PASSWORD) return t.auth.passwordTooShort;
    if (password.length > MAX_PASSWORD) return t.auth.passwordTooLong;
    return null;
  }

  /** Erros da API com mensagem própria de cada modo; o resto vai para o tradutor genérico. */
  function describe(err: unknown): string {
    if (err instanceof ApiError && locale !== 'pt') {
      if (err.status === 401) return t.auth.wrongCredentials;
      if (err.status === 409) return t.auth.emailTaken;
      if (err.status === 403) return t.auth.registrationDisabled;
    }
    return errorMessage(err);
  }

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(new Error(invalid));
      return;
    }

    setSubmitting(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === 'forgot') {
        await forgotPassword(cleanEmail, locale);
        setSentTo(cleanEmail);
      } else {
        const input = { email: cleanEmail, password };
        await (isLogin ? login(input) : register(input));
      }
    } catch (err) {
      setError(err);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSentTo(null);
  }

  // Erros de validação local já vêm traduzidos; os da API passam pelo describe().
  const errorText = !error
    ? null
    : error instanceof ApiError
      ? describe(error)
      : error instanceof Error && error.message
        ? error.message
        : t.errors.generic;

  const emailField = (
    <Field label={t.auth.email} icon={MailIcon}>
      <Input
        type="email"
        name="email"
        autoComplete="email"
        autoFocus
        required
        placeholder={t.auth.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={!!error || undefined}
        className={INPUT_CLASS}
      />
    </Field>
  );

  const backToLogin = (
    <Button type="button" variant="ghost" className="w-full" onClick={() => switchMode('login')}>
      <ArrowLeftIcon /> {t.auth.backToLogin}
    </Button>
  );

  // --- Recuperação: link enviado ---
  if (mode === 'forgot' && sentTo) {
    return (
      <div className="space-y-5 text-center" role="status">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheckIcon className="size-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{t.auth.forgotSentTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.auth.forgotSent(sentTo)}</p>
          <p className="text-xs text-muted-foreground">{t.auth.forgotSpam}</p>
        </div>
        {backToLogin}
      </div>
    );
  }

  // --- Recuperação: pedir o link ---
  if (mode === 'forgot') {
    return (
      <>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t.auth.forgotTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.auth.forgotDescription}</p>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {emailField}
          {errorText && <FormError>{errorText}</FormError>}
          <Button type="submit" size="lg" className="h-11 w-full text-base shadow-sm" disabled={submitting}>
            {submitting ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            {t.auth.forgotSubmit}
          </Button>
          {backToLogin}
        </form>
      </>
    );
  }

  // --- Entrar / Criar conta ---
  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              'h-9 rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              mode === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'login' ? t.auth.login : t.auth.register}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          {isLogin ? t.auth.loginTitle : t.auth.registerTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isLogin ? t.auth.loginDescription : t.auth.registerDescription}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {emailField}

        <div className="space-y-1.5">
          <PasswordField
            label={t.auth.password}
            value={password}
            onChange={setPassword}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : MIN_PASSWORD}
            invalid={!!error}
          />
          {isLogin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="rounded text-xs font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t.auth.forgotLink}
              </button>
            </div>
          )}
        </div>

        {!isLogin && <PasswordRule password={password} />}

        {errorText && <FormError>{errorText}</FormError>}

        <Button type="submit" size="lg" className="h-11 w-full text-base shadow-sm" disabled={submitting}>
          {submitting ? <Loader2Icon className="animate-spin" /> : isLogin ? <LogInIcon /> : <UserPlusIcon />}
          {isLogin ? t.auth.login : t.auth.register}
        </Button>
      </form>
    </>
  );
}
