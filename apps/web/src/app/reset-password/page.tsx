import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-shell';
import { ResetPasswordForm } from '@/components/reset-password-form';

export const metadata: Metadata = {
  title: 'Calorie Tracker',
  // Página só acessível por link de email: não deve aparecer em pesquisas.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
      <AppHeader />
      <ResetPasswordForm />
    </main>
  );
}
