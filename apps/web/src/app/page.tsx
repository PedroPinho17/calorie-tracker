import { AppHeader, AppShell } from '@/components/app-shell';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12 lg:max-w-5xl">
      <AppHeader />
      <AppShell />
    </main>
  );
}
