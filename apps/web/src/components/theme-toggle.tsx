'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.app.toggleTheme}
      title={t.app.toggleTheme}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {/* Os dois ícones existem sempre; o CSS escolhe → sem diferenças entre servidor e cliente. */}
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}

/** Botão PT/EN: mostra a língua atual; clicar troca para a outra. */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 font-semibold tracking-wide text-muted-foreground hover:text-foreground"
      aria-label={t.app.switchLanguage}
      title={t.app.switchLanguage}
      onClick={() => setLocale(locale === 'pt' ? 'en' : 'pt')}
    >
      {locale.toUpperCase()}
    </Button>
  );
}
