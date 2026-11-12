'use client';

import { useState } from 'react';
import { CheckIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Peças partilhadas pelos formulários de login, registo, recuperação e password nova. */

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;

export const INPUT_CLASS = 'h-11 bg-muted/50 pl-10 focus-visible:bg-background dark:bg-input/30';

export function Field({
  label,
  icon: Icon,
  trailing,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      {label}
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
        {trailing}
      </span>
    </label>
  );
}

/** Campo de password com o "olho" para mostrar/esconder. */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  invalid,
  autoFocus,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  invalid?: boolean;
  autoFocus?: boolean;
  minLength?: number;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? t.auth.hidePassword : t.auth.showPassword;

  return (
    <Field
      label={label}
      icon={LockKeyholeIcon}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      }
    >
      <Input
        type={visible ? 'text' : 'password'}
        name="password"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        minLength={minLength}
        maxLength={MAX_PASSWORD}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(INPUT_CLASS, 'pr-11')}
      />
    </Field>
  );
}

/** "✓ Pelo menos 10 caracteres" — fica verde quando a regra é cumprida. */
export function PasswordRule({ password }: { password: string }) {
  const { t } = useI18n();
  const ok = password.length >= MIN_PASSWORD;
  return (
    <div className="-mt-1 space-y-0.5 text-xs">
      <p
        className={cn(
          'flex items-center gap-1.5 transition-colors',
          ok ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-full transition-colors',
            ok ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {ok && <CheckIcon className="size-3" />}
        </span>
        {t.auth.passwordRule}
      </p>
      <p className="pl-5.5 text-muted-foreground">{t.auth.passwordHint}</p>
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
