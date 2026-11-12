'use client';

import { createContext, use, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MealType } from '@repo/shared';
import { ApiError } from '@/lib/api';

export type Locale = 'pt' | 'en';
export const LOCALES: Locale[] = ['pt', 'en'];

/** Locale usado no Intl (datas, horas). */
const INTL: Record<Locale, string> = { pt: 'pt-PT', en: 'en-GB' };

const pt = {
  app: {
    tagline: 'Fotografa a refeição e vê as calorias e macros.',
    loading: 'A carregar',
    logout: 'Sair',
    toggleTheme: 'Alternar tema claro/escuro',
    switchLanguage: 'Switch to English',
    sessionExpired: 'A sessão expirou. Entra outra vez.',
    account: 'Conta',
    darkTheme: 'Tema escuro',
    lightTheme: 'Tema claro',
  },
  auth: {
    heroEyebrow: 'Calorie Tracker',
    heroTitle: 'Uma foto. Todas as macros.',
    features: [
      'Fotografa o prato — a IA identifica os alimentos e as gramas',
      'Valores da USDA e do Open Food Facts',
      'Metas diárias e histórico da semana',
    ],
    previewMeal: 'Ovos com torrada',
    login: 'Entrar',
    register: 'Criar conta',
    loginTitle: 'Olá outra vez',
    registerTitle: 'Cria a tua conta',
    loginDescription: 'Entra para veres e registares as tuas refeições.',
    registerDescription: 'As tuas refeições e metas ficam guardadas só para ti.',
    email: 'Email',
    emailPlaceholder: 'tu@exemplo.com',
    password: 'Password',
    showPassword: 'Mostrar password',
    hidePassword: 'Esconder password',
    passwordRule: 'Pelo menos 10 caracteres',
    passwordHint: 'Uma frase fácil de lembrar funciona bem.',
    invalidEmail: 'Email inválido.',
    passwordTooShort: 'A password tem de ter pelo menos 10 caracteres.',
    passwordTooLong: 'A password pode ter no máximo 128 caracteres.',
    passwordRequired: 'Escreve a password.',
    wrongCredentials: 'Email ou password incorretos.',
    emailTaken: 'Já existe uma conta com este email.',
    registrationDisabled: 'O registo de novas contas está desativado.',
    forgotLink: 'Esqueceste-te da password?',
    forgotTitle: 'Recuperar password',
    forgotDescription: 'Escreve o email da tua conta e enviamos-te um link para definires uma password nova.',
    forgotSubmit: 'Enviar link',
    forgotSentTitle: 'Vê o teu email',
    forgotSent: (email: string) =>
      `Se existir uma conta com ${email}, enviámos um link para definires uma password nova. O link expira em 30 minutos.`,
    forgotSpam: 'Não chegou? Espera um minuto e vê a pasta de spam.',
    backToLogin: 'Voltar ao login',
    resetTitle: 'Definir password nova',
    resetDescription: 'Escolhe uma password nova. Depois entras logo e as outras sessões terminam.',
    newPassword: 'Password nova',
    resetSubmit: 'Guardar password',
    resetDone: 'Password alterada. Já entraste na tua conta.',
    resetInvalid: 'Este link é inválido ou já expirou. Pede um novo.',
    requestNewLink: 'Pedir um link novo',
  },
  errors: {
    network: 'Não foi possível ligar à API. Está a correr?',
    tooMany: 'Demasiadas tentativas. Espera um minuto e tenta outra vez.',
    unavailable: 'O serviço está ocupado. Tenta daqui a pouco.',
    badGateway: 'O reconhecimento de imagem falhou. Tenta outra vez.',
    invalidImage: 'A imagem não é válida (JPG, PNG, WebP ou HEIC até 10 MB).',
    notFound: 'Não encontrado.',
    invalid: 'Dados inválidos.',
    generic: 'Algo correu mal. Tenta outra vez.',
  },
  meals: {
    breakfast: 'Pequeno-almoço',
    lunch: 'Almoço',
    snack: 'Lanche',
    dinner: 'Jantar',
  } satisfies Record<MealType, string>,
  macros: { protein: 'Proteína', carbs: 'Hidratos', fat: 'Gordura' },
  macroEnergyShare: (label: string, pct: number) => `${label}: ${pct}% da energia`,
  day: {
    today: 'Hoje',
    yesterday: 'Ontem',
    summary: 'Resumo do dia',
    previous: 'Dia anterior',
    next: 'Dia seguinte',
    loadError: 'Erro a carregar o dia',
    remaining: (n: number) => `Faltam ${n} kcal`,
    over: (n: number) => `Passaste ${n} kcal da meta`,
    editGoals: 'Alterar metas',
    empty: 'Ainda não há refeições registadas neste dia.',
    deleteMeal: 'Apagar refeição',
    deleted: (meal: string) => `${meal} apagado`,
    deleteFailed: 'Não foi possível apagar',
  },
  mealEdit: {
    expand: 'Ver alimentos',
    collapse: 'Esconder alimentos',
    swap: 'Trocar alimento',
    updated: 'Alimento atualizado',
    updateFailed: 'Não foi possível atualizar',
  },
  water: {
    title: 'Água',
    of: (goal: number) => `de ${goal} ml`,
    glass: 'Copo',
    bottle: 'Garrafa',
    undo: 'Desfazer o último registo',
    remaining: (ml: number) => `Faltam ${ml} ml`,
    done: 'Meta de água cumprida',
    failed: 'Não foi possível registar a água',
  },
  weight: {
    title: 'Peso',
    label: 'Peso de hoje (kg)',
    save: 'Registar',
    saved: 'Peso registado',
    failed: 'Não foi possível registar o peso',
    invalid: 'Escreve um peso entre 20 e 400 kg.',
    empty: 'Regista o teu peso para veres a evolução.',
    change: (kg: number, days: number) => `${kg > 0 ? '+' : ''}${kg.toFixed(1)} kg em ${days} dias`,
    range: 'Últimos 90 dias',
  },
  sources: 'Valores nutricionais: INSA (Tabela da Composição de Alimentos), USDA FoodData Central e Open Food Facts.',
  week: {
    title: 'Últimos 7 dias',
    goal: (kcal: number) => `Meta: ${kcal} kcal`,
    average: (kcal: number) => `Média: ${kcal} kcal`,
  },
  goals: {
    kcal: 'Calorias (kcal)',
    protein: 'Proteína (g)',
    carbs: 'Hidratos (g)',
    fat: 'Gordura (g)',
    waterMl: 'Água (ml)',
    saved: 'Metas guardadas',
    saveFailed: 'Não foi possível guardar',
    cancel: 'Cancelar',
    save: 'Guardar metas',
  },
  search: {
    placeholder: 'Pesquisar em inglês ou código de barras',
    recent: 'Recentes',
    noResults: 'Sem resultados. Tenta outras palavras.',
    error: 'Erro na pesquisa',
  },
  photo: {
    notImage: 'Escolhe um ficheiro de imagem.',
    tooBig: (mb: number) => `A imagem tem de ter menos de ${mb} MB.`,
    analyzeFailed: 'Não foi possível analisar a foto',
    alt: 'Foto da refeição',
    identifying: 'A identificar alimentos…',
    change: 'Trocar',
    remove: 'Remover foto',
    dropTitle: 'Tira uma foto ou escolhe uma imagem',
    dropHint: (mb: number) => `Arrasta para aqui · JPG, PNG, WebP ou HEIC até ${mb} MB`,
    analyzing: 'A analisar…',
    analyze: 'Analisar foto',
    orManual: 'ou adiciona sem foto',
    newMeal: 'Nova refeição',
    cancel: 'Cancelar',
  },
  editor: {
    correctionSaved: 'Correção guardada',
    correctionDescription: (from: string, to: string) => `Da próxima vez, “${from}” será “${to}”.`,
    correctionFailed: 'Não foi possível guardar a correção',
    mealSaved: (meal: string) => `${meal} guardado`,
    mealFailed: 'Não foi possível guardar a refeição',
    estimatedTotal: 'Total estimado',
    foods: 'Alimentos',
    noneFound: 'Não encontrámos comida nesta foto. Tenta outra (mais perto e com boa luz) ou adiciona os alimentos à mão.',
    addFood: 'Adicionar alimento',
    mealType: 'Tipo de refeição',
    saveMeal: 'Guardar refeição',
    unmatched: (n: number) =>
      n === 1
        ? '1 alimento sem correspondência não será guardado — usa'
        : `${n} alimentos sem correspondência não serão guardados — usa`,
    unmatchedSuffix: 'para o corrigir.',
    sourcePhoto: 'Quantidades estimadas a partir da foto. Valores nutricionais do INSA, da USDA e do Open Food Facts.',
    sourceManual: 'Valores nutricionais do INSA, da USDA FoodData Central e do Open Food Facts.',
    learned: 'aprendido',
    confirm: 'confirma',
    lowConfidence: 'A IA não tem a certeza — confirma se é este o alimento.',
    noMatch: 'sem correspondência',
    identifiedAs: (name: string) => `Identificado como “${name}”`,
    grams: 'Gramas',
    fixFood: 'Corrigir alimento',
    removeFood: 'Remover alimento',
  },
};

export type Messages = typeof pt;

const en: Messages = {
  app: {
    tagline: 'Snap your meal and see its calories and macros.',
    loading: 'Loading',
    logout: 'Log out',
    toggleTheme: 'Toggle light/dark theme',
    switchLanguage: 'Mudar para português',
    sessionExpired: 'Your session expired. Please log in again.',
    account: 'Account',
    darkTheme: 'Dark theme',
    lightTheme: 'Light theme',
  },
  auth: {
    heroEyebrow: 'Calorie Tracker',
    heroTitle: 'One photo. Every macro.',
    features: [
      'Snap your plate — AI identifies the foods and their weight',
      'Nutrition data from USDA and Open Food Facts',
      'Daily goals and weekly history',
    ],
    previewMeal: 'Eggs on toast',
    login: 'Log in',
    register: 'Sign up',
    loginTitle: 'Welcome back',
    registerTitle: 'Create your account',
    loginDescription: 'Log in to see and track your meals.',
    registerDescription: 'Your meals and goals are private to you.',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordRule: 'At least 10 characters',
    passwordHint: 'An easy-to-remember phrase works well.',
    invalidEmail: 'Invalid email.',
    passwordTooShort: 'Password must be at least 10 characters.',
    passwordTooLong: 'Password can be at most 128 characters.',
    passwordRequired: 'Enter your password.',
    wrongCredentials: 'Wrong email or password.',
    emailTaken: 'An account with this email already exists.',
    registrationDisabled: 'New sign-ups are disabled.',
    forgotLink: 'Forgot your password?',
    forgotTitle: 'Reset password',
    forgotDescription: "Enter your account's email and we'll send you a link to set a new password.",
    forgotSubmit: 'Send link',
    forgotSentTitle: 'Check your email',
    forgotSent: (email) =>
      `If an account exists for ${email}, we've sent a link to set a new password. The link expires in 30 minutes.`,
    forgotSpam: "Didn't get it? Wait a minute and check your spam folder.",
    backToLogin: 'Back to log in',
    resetTitle: 'Set a new password',
    resetDescription: "Choose a new password. You'll be logged in and your other sessions will end.",
    newPassword: 'New password',
    resetSubmit: 'Save password',
    resetDone: "Password changed. You're logged in.",
    resetInvalid: 'This link is invalid or has expired. Request a new one.',
    requestNewLink: 'Request a new link',
  },
  errors: {
    network: "Couldn't reach the API. Is it running?",
    tooMany: 'Too many attempts. Wait a minute and try again.',
    unavailable: 'The service is busy. Try again shortly.',
    badGateway: 'Image recognition failed. Please try again.',
    invalidImage: 'Invalid image (JPG, PNG, WebP or HEIC up to 10 MB).',
    notFound: 'Not found.',
    invalid: 'Invalid data.',
    generic: 'Something went wrong. Please try again.',
  },
  meals: { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' },
  macros: { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' },
  macroEnergyShare: (label, pct) => `${label}: ${pct}% of energy`,
  day: {
    today: 'Today',
    yesterday: 'Yesterday',
    summary: 'Daily summary',
    previous: 'Previous day',
    next: 'Next day',
    loadError: 'Error loading the day',
    remaining: (n) => `${n} kcal left`,
    over: (n) => `${n} kcal over your goal`,
    editGoals: 'Edit goals',
    empty: 'No meals logged on this day yet.',
    deleteMeal: 'Delete meal',
    deleted: (meal) => `${meal} deleted`,
    deleteFailed: "Couldn't delete",
  },
  mealEdit: {
    expand: 'Show foods',
    collapse: 'Hide foods',
    swap: 'Swap food',
    updated: 'Food updated',
    updateFailed: "Couldn't update",
  },
  water: {
    title: 'Water',
    of: (goal) => `of ${goal} ml`,
    glass: 'Glass',
    bottle: 'Bottle',
    undo: 'Undo last entry',
    remaining: (ml) => `${ml} ml to go`,
    done: 'Water goal reached',
    failed: "Couldn't log water",
  },
  weight: {
    title: 'Weight',
    label: "Today's weight (kg)",
    save: 'Log',
    saved: 'Weight logged',
    failed: "Couldn't log weight",
    invalid: 'Enter a weight between 20 and 400 kg.',
    empty: 'Log your weight to see your progress.',
    change: (kg, days) => `${kg > 0 ? '+' : ''}${kg.toFixed(1)} kg in ${days} days`,
    range: 'Last 90 days',
  },
  sources: 'Nutrition data: INSA (Portuguese Food Composition Table), USDA FoodData Central and Open Food Facts.',
  week: {
    title: 'Last 7 days',
    goal: (kcal) => `Goal: ${kcal} kcal`,
    average: (kcal) => `Average: ${kcal} kcal`,
  },
  goals: {
    kcal: 'Calories (kcal)',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
    waterMl: 'Water (ml)',
    saved: 'Goals saved',
    saveFailed: "Couldn't save",
    cancel: 'Cancel',
    save: 'Save goals',
  },
  search: {
    placeholder: 'Search foods or enter a barcode',
    recent: 'Recent',
    noResults: 'No results. Try other words.',
    error: 'Search failed',
  },
  photo: {
    notImage: 'Please choose an image file.',
    tooBig: (mb) => `The image must be smaller than ${mb} MB.`,
    analyzeFailed: "Couldn't analyze the photo",
    alt: 'Meal photo',
    identifying: 'Identifying foods…',
    change: 'Change',
    remove: 'Remove photo',
    dropTitle: 'Take a photo or choose an image',
    dropHint: (mb) => `Drag it here · JPG, PNG, WebP or HEIC up to ${mb} MB`,
    analyzing: 'Analyzing…',
    analyze: 'Analyze photo',
    orManual: 'or add without a photo',
    newMeal: 'New meal',
    cancel: 'Cancel',
  },
  editor: {
    correctionSaved: 'Correction saved',
    correctionDescription: (from, to) => `Next time, “${from}” will be “${to}”.`,
    correctionFailed: "Couldn't save the correction",
    mealSaved: (meal) => `${meal} saved`,
    mealFailed: "Couldn't save the meal",
    estimatedTotal: 'Estimated total',
    foods: 'Foods',
    noneFound: "We couldn't find any food in this photo. Try another one (closer, with good light) or add the foods manually.",
    addFood: 'Add food',
    mealType: 'Meal type',
    saveMeal: 'Save meal',
    unmatched: (n) =>
      n === 1 ? "1 unmatched food won't be saved — use" : `${n} unmatched foods won't be saved — use`,
    unmatchedSuffix: 'to fix it.',
    sourcePhoto: 'Portions estimated from the photo. Nutrition data from INSA, USDA and Open Food Facts.',
    sourceManual: 'Nutrition data from INSA, USDA FoodData Central and Open Food Facts.',
    learned: 'learned',
    confirm: 'check',
    lowConfidence: "The AI isn't sure — check this is the right food.",
    noMatch: 'no match',
    identifiedAs: (name) => `Identified as “${name}”`,
    grams: 'Grams',
    fixFood: 'Fix food',
    removeFood: 'Remove food',
  },
};

const MESSAGES: Record<Locale, Messages> = { pt, en };

// --- Língua escolhida: guardada no browser; da 1.ª vez segue a língua do browser. ---

const STORAGE_KEY = 'locale';
const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch {
    // localStorage bloqueado (modo privado, etc.)
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // sem persistência: a escolha dura até recarregar
  }
  cachedLocale = locale;
  listeners.forEach((l) => l());
}

let cachedLocale: Locale | null = null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => (cachedLocale ??= readLocale());
// O servidor não sabe a língua do utilizador: pré-renderiza em português.
const getServerSnapshot = (): Locale => 'pt';

type I18nValue = {
  locale: Locale;
  intlLocale: string;
  t: Messages;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, intlLocale: INTL[locale], t: MESSAGES[locale], setLocale: writeLocale }),
    [locale],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n() tem de estar dentro de <I18nProvider>');
  return ctx;
}

/**
 * Mensagem de erro na língua atual. A API responde em português (mensagens específicas):
 * em PT usamo-las tal como vêm; em EN traduzimos pelo código HTTP.
 */
export function useErrorMessage() {
  const { locale, t } = useI18n();
  return useCallback(
    (err: unknown, fallback = t.errors.generic): string => {
      if (!(err instanceof ApiError)) return err instanceof Error && locale === 'pt' ? err.message : fallback;
      if (err.status === 0) return t.errors.network;
      if (locale === 'pt') return err.message;
      switch (err.status) {
        case 400:
          return t.errors.invalid;
        case 404:
          return t.errors.notFound;
        case 422:
          return t.errors.invalidImage;
        case 429:
          return t.errors.tooMany;
        case 502:
          return t.errors.badGateway;
        case 503:
          return t.errors.unavailable;
        default:
          return fallback;
      }
    },
    [locale, t],
  );
}
