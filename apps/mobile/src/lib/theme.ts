import { useColorScheme } from 'react-native';

/** Cores iguais às da web (apps/web/src/app/globals.css), em claro e escuro. */
const light = {
  background: '#f6f7f6',
  card: '#ffffff',
  text: '#171717',
  muted: '#737373',
  mutedBg: '#f1f2f1',
  border: '#e5e5e5',
  primary: '#0e8a47',
  primaryFg: '#ffffff',
  primarySoft: 'rgba(14, 138, 71, 0.10)',
  protein: '#3b7fe0',
  carbs: '#e0a21a',
  fat: '#e5534b',
  destructive: '#dc2626',
  destructiveSoft: 'rgba(220, 38, 38, 0.10)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#141414',
  card: '#1f1f1f',
  text: '#fafafa',
  muted: '#a3a3a3',
  mutedBg: '#2a2a2a',
  border: 'rgba(255, 255, 255, 0.10)',
  primary: '#3cba70',
  primaryFg: '#0b2616',
  primarySoft: 'rgba(60, 186, 112, 0.15)',
  protein: '#6aa1f0',
  carbs: '#efb84a',
  fat: '#f07a72',
  destructive: '#f87171',
  destructiveSoft: 'rgba(248, 113, 113, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Cores do tema atual (segue o modo claro/escuro do sistema). */
export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
