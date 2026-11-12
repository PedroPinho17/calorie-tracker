'use client';

import { LanguagesIcon, Loader2Icon, LogOutIcon, MoonIcon, SaladIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth-provider';
import { AuthForm } from '@/components/auth-form';
import { Tracker } from '@/components/tracker';
import { LanguageToggle, ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

/** Mostra o login enquanto não houver sessão; depois, a app. */
export function AppShell() {
  const auth = useAuth();
  const { t } = useI18n();

  if (auth.status === 'loading') {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2Icon className="size-6 animate-spin" aria-label={t.app.loading} />
      </div>
    );
  }

  if (auth.status === 'anonymous') return <AuthForm initialError={auth.error} />;

  // key: ao trocar de conta, todo o estado (datas, fotos, resultados) recomeça do zero.
  return <Tracker key={auth.user.id} />;
}

export function AppHeader() {
  const { t } = useI18n();
  const auth = useAuth();
  const signedIn = auth.status === 'authenticated';

  return (
    <header className="mb-8 flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <SaladIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold tracking-tight">Calorie Tracker</h1>
        {/* Com sessão, o subtítulo é ruído: a app explica-se sozinha. */}
        {!signedIn && <p className="truncate text-sm text-muted-foreground">{t.app.tagline}</p>}
      </div>
      {signedIn ? (
        <UserMenu email={auth.user.email} onLogout={() => void auth.logout()} />
      ) : (
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      )}
    </header>
  );
}

/** Círculo com a inicial; abre email, língua, tema e "Sair". */
function UserMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.app.account}
        title={email}
        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase ring-offset-2 ring-offset-background transition outline-none hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-primary/40"
      >
        {email.charAt(0)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-[11px] tracking-wide uppercase">{t.app.account}</span>
          <span className="block truncate text-sm font-medium text-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLocale(locale === 'pt' ? 'en' : 'pt')}>
          <LanguagesIcon />
          {locale === 'pt' ? 'English' : 'Português'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {resolvedTheme === 'dark' ? t.app.lightTheme : t.app.darkTheme}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>
          <LogOutIcon />
          {t.app.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
