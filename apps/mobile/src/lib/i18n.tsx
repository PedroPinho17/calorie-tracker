import { createContext, use, useCallback, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import type { MealType } from '@repo/shared';
import { ApiError } from './api';

export type Locale = 'pt' | 'en';

const INTL: Record<Locale, string> = { pt: 'pt-PT', en: 'en-GB' };

const pt = {
  app: {
    tagline: 'Fotografa a refeição e vê as calorias e macros.',
    account: 'Conta',
    logout: 'Sair',
    logoutConfirm: 'Terminar a sessão neste telemóvel?',
    cancel: 'Cancelar',
    language: 'Língua',
    goals: 'Metas diárias',
    configError: 'Configuração inválida',
  },
  auth: {
    heroTitle: 'Uma foto. Todas as macros.',
    features: [
      'Fotografa o prato — a IA identifica os alimentos e as gramas',
      'Valores da USDA e do Open Food Facts',
      'Metas diárias e histórico da semana',
    ],
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
    invalidEmail: 'Email inválido.',
    passwordRequired: 'Escreve a password.',
    passwordTooShort: 'A password tem de ter pelo menos 10 caracteres.',
    wrongCredentials: 'Email ou password incorretos.',
    emailTaken: 'Já existe uma conta com este email.',
    registrationDisabled: 'O registo de novas contas está desativado.',
    forgotLink: 'Esqueceste-te da password?',
    forgotTitle: 'Recuperar password',
    forgotDescription: 'Escreve o email da tua conta e enviamos-te um link para definires uma password nova.',
    forgotSubmit: 'Enviar link',
    forgotSentTitle: 'Vê o teu email',
    forgotSent: (email: string) =>
      `Se existir uma conta com ${email}, enviámos um link para definires uma password nova. Depois, entra aqui com a password nova.`,
    backToLogin: 'Voltar ao login',
    sessionExpired: 'A sessão expirou. Entra outra vez.',
  },
  errors: {
    network: 'Não foi possível ligar à API. Verifica a ligação.',
    tooMany: 'Demasiadas tentativas. Espera um minuto e tenta outra vez.',
    unavailable: 'O serviço está ocupado. Tenta daqui a pouco.',
    badGateway: 'O reconhecimento de imagem falhou. Tenta outra vez.',
    invalidImage: 'A imagem não é válida (JPG, PNG, WebP ou HEIC até 10 MB).',
    notFound: 'Não encontrado.',
    invalid: 'Dados inválidos.',
    generic: 'Algo correu mal. Tenta outra vez.',
  },
  meals: { breakfast: 'Pequeno-almoço', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar' } satisfies Record<
    MealType,
    string
  >,
  macros: { protein: 'Proteína', carbs: 'Hidratos', fat: 'Gordura' },
  home: {
    newMeal: 'Nova refeição',
    takePhoto: 'Tirar foto',
    takePhotoHint: 'A IA identifica os alimentos e as gramas',
    gallery: 'Galeria',
    barcode: 'Código de barras',
    search: 'Pesquisar',
    summary: 'Resumo do dia',
    today: 'Hoje',
    yesterday: 'Ontem',
    previousDay: 'Dia anterior',
    nextDay: 'Dia seguinte',
    remaining: (n: number) => `Faltam ${n} kcal`,
    over: (n: number) => `Passaste ${n} kcal da meta`,
    empty: 'Ainda não há refeições registadas neste dia.',
    deleteMeal: 'Apagar refeição',
    deleteConfirm: (meal: string) => `Apagar "${meal}"?`,
    delete: 'Apagar',
    week: 'Últimos 7 dias',
    average: (n: number) => `Média ${n} kcal`,
    goal: (n: number) => `Meta ${n} kcal`,
    cameraDenied: 'Sem acesso à câmara. Ativa-o nas definições do telemóvel.',
    photosDenied: 'Sem acesso às fotos. Ativa-o nas definições do telemóvel.',
  },
  meal: {
    title: 'Refeição',
    analyzing: 'A identificar alimentos…',
    analyzeFailed: 'Não foi possível analisar a foto',
    retry: 'Tentar outra vez',
    estimatedTotal: 'Total estimado',
    foods: 'Alimentos',
    noneFound: 'Não encontrámos comida nesta foto. Tenta outra (mais perto e com boa luz) ou adiciona os alimentos à mão.',
    addFood: 'Adicionar',
    mealType: 'Tipo de refeição',
    save: 'Guardar refeição',
    saved: (meal: string) => `${meal} guardado`,
    saveFailed: 'Não foi possível guardar a refeição',
    learned: 'aprendido',
    confirm: 'confirma',
    lowConfidence: 'A IA não tem a certeza — confirma se é este o alimento.',
    noMatch: 'sem correspondência — toca para escolher',
    identifiedAs: (name: string) => `Identificado como “${name}”`,
    unmatched: (n: number) =>
      n === 1 ? '1 alimento sem correspondência não será guardado.' : `${n} alimentos sem correspondência não serão guardados.`,
    correctionSaved: (from: string, to: string) => `Da próxima vez, “${from}” será “${to}”.`,
    remove: 'Remover',
    discard: 'Descartar refeição?',
    discardConfirm: 'Descartar',
    sourcePhoto: 'Quantidades estimadas a partir da foto. Valores nutricionais do INSA, da USDA e do Open Food Facts.',
    sourceManual: 'Valores nutricionais do INSA, da USDA FoodData Central e do Open Food Facts.',
  },
  saved: {
    title: 'Refeição',
    swap: 'Trocar alimento',
    updateFailed: 'Não foi possível atualizar',
    notFound: 'Esta refeição já não existe.',
  },
  water: {
    title: 'Água',
    of: (goal: number) => `de ${goal} ml`,
    glass: 'Copo',
    bottle: 'Garrafa',
    undo: 'Desfazer o último registo',
    remaining: (ml: number) => `Faltam ${ml} ml`,
    done: 'Meta cumprida',
  },
  weight: {
    title: 'Peso',
    placeholder: 'Peso de hoje (kg)',
    save: 'Registar',
    invalid: 'Escreve um peso entre 20 e 400 kg.',
    empty: 'Regista o teu peso para veres a evolução.',
    change: (kg: number, days: number) => `${kg > 0 ? '+' : ''}${kg.toFixed(1)} kg em ${days} dias`,
  },
  sources: 'Valores nutricionais: INSA (Tabela da Composição de Alimentos), USDA FoodData Central e Open Food Facts.',
  search: {
    title: 'Pesquisar alimento',
    placeholder: 'Em inglês, ex.: "egg" ou "rice"',
    recent: 'Recentes',
    noResults: 'Sem resultados. Tenta outras palavras.',
    hint: 'Escreve pelo menos 2 letras.',
  },
  scan: {
    title: 'Código de barras',
    hint: 'Aponta para o código de barras da embalagem',
    permission: 'Precisamos da câmara para ler códigos de barras.',
    allow: 'Permitir câmara',
    notFound: (code: string) => `O produto ${code} não está no Open Food Facts.`,
    searchInstead: 'Pesquisar pelo nome',
    again: 'Ler outro código',
    looking: 'A procurar o produto…',
  },
  goals: {
    title: 'Metas diárias',
    kcal: 'Calorias (kcal)',
    protein: 'Proteína (g)',
    carbs: 'Hidratos (g)',
    fat: 'Gordura (g)',
    waterMl: 'Água (ml)',
    save: 'Guardar metas',
    saved: 'Metas guardadas',
    invalid: 'Calorias entre 500 e 10000; macros entre 0 e 1000 g; água até 10000 ml.',
  },
};

export type Messages = typeof pt;

const en: Messages = {
  app: {
    tagline: 'Snap your meal and see its calories and macros.',
    account: 'Account',
    logout: 'Log out',
    logoutConfirm: 'Log out on this phone?',
    cancel: 'Cancel',
    language: 'Language',
    goals: 'Daily goals',
    configError: 'Invalid configuration',
  },
  auth: {
    heroTitle: 'One photo. Every macro.',
    features: [
      'Snap your plate — AI identifies the foods and their weight',
      'Nutrition data from USDA and Open Food Facts',
      'Daily goals and weekly history',
    ],
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
    invalidEmail: 'Invalid email.',
    passwordRequired: 'Enter your password.',
    passwordTooShort: 'Password must be at least 10 characters.',
    wrongCredentials: 'Wrong email or password.',
    emailTaken: 'An account with this email already exists.',
    registrationDisabled: 'New sign-ups are disabled.',
    forgotLink: 'Forgot your password?',
    forgotTitle: 'Reset password',
    forgotDescription: "Enter your account's email and we'll send you a link to set a new password.",
    forgotSubmit: 'Send link',
    forgotSentTitle: 'Check your email',
    forgotSent: (email) =>
      `If an account exists for ${email}, we've sent a link to set a new password. Then log in here with the new password.`,
    backToLogin: 'Back to log in',
    sessionExpired: 'Your session expired. Please log in again.',
  },
  errors: {
    network: "Couldn't reach the API. Check your connection.",
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
  home: {
    newMeal: 'New meal',
    takePhoto: 'Take a photo',
    takePhotoHint: 'AI identifies the foods and their weight',
    gallery: 'Gallery',
    barcode: 'Barcode',
    search: 'Search',
    summary: 'Daily summary',
    today: 'Today',
    yesterday: 'Yesterday',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    remaining: (n) => `${n} kcal left`,
    over: (n) => `${n} kcal over your goal`,
    empty: 'No meals logged on this day yet.',
    deleteMeal: 'Delete meal',
    deleteConfirm: (meal) => `Delete "${meal}"?`,
    delete: 'Delete',
    week: 'Last 7 days',
    average: (n) => `Average ${n} kcal`,
    goal: (n) => `Goal ${n} kcal`,
    cameraDenied: 'No camera access. Enable it in your phone settings.',
    photosDenied: 'No photo access. Enable it in your phone settings.',
  },
  meal: {
    title: 'Meal',
    analyzing: 'Identifying foods…',
    analyzeFailed: "Couldn't analyze the photo",
    retry: 'Try again',
    estimatedTotal: 'Estimated total',
    foods: 'Foods',
    noneFound: "We couldn't find any food in this photo. Try another one (closer, with good light) or add the foods manually.",
    addFood: 'Add',
    mealType: 'Meal type',
    save: 'Save meal',
    saved: (meal) => `${meal} saved`,
    saveFailed: "Couldn't save the meal",
    learned: 'learned',
    confirm: 'check',
    lowConfidence: "The AI isn't sure — check this is the right food.",
    noMatch: 'no match — tap to choose',
    identifiedAs: (name) => `Identified as “${name}”`,
    unmatched: (n) => (n === 1 ? "1 unmatched food won't be saved." : `${n} unmatched foods won't be saved.`),
    correctionSaved: (from, to) => `Next time, “${from}” will be “${to}”.`,
    remove: 'Remove',
    discard: 'Discard this meal?',
    discardConfirm: 'Discard',
    sourcePhoto: 'Portions estimated from the photo. Nutrition data from INSA, USDA and Open Food Facts.',
    sourceManual: 'Nutrition data from INSA, USDA FoodData Central and Open Food Facts.',
  },
  saved: {
    title: 'Meal',
    swap: 'Swap food',
    updateFailed: "Couldn't update",
    notFound: 'This meal no longer exists.',
  },
  water: {
    title: 'Water',
    of: (goal) => `of ${goal} ml`,
    glass: 'Glass',
    bottle: 'Bottle',
    undo: 'Undo last entry',
    remaining: (ml) => `${ml} ml to go`,
    done: 'Goal reached',
  },
  weight: {
    title: 'Weight',
    placeholder: "Today's weight (kg)",
    save: 'Log',
    invalid: 'Enter a weight between 20 and 400 kg.',
    empty: 'Log your weight to see your progress.',
    change: (kg, days) => `${kg > 0 ? '+' : ''}${kg.toFixed(1)} kg in ${days} days`,
  },
  sources: 'Nutrition data: INSA (Portuguese Food Composition Table), USDA FoodData Central and Open Food Facts.',
  search: {
    title: 'Search food',
    placeholder: 'e.g. "egg" or "rice"',
    recent: 'Recent',
    noResults: 'No results. Try other words.',
    hint: 'Type at least 2 letters.',
  },
  scan: {
    title: 'Barcode',
    hint: "Point at the package's barcode",
    permission: 'We need the camera to read barcodes.',
    allow: 'Allow camera',
    notFound: (code) => `Product ${code} isn't in Open Food Facts.`,
    searchInstead: 'Search by name',
    again: 'Scan another code',
    looking: 'Looking up the product…',
  },
  goals: {
    title: 'Daily goals',
    kcal: 'Calories (kcal)',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
    waterMl: 'Water (ml)',
    save: 'Save goals',
    saved: 'Goals saved',
    invalid: 'Calories between 500 and 10000; macros between 0 and 1000 g; water up to 10000 ml.',
  },
};

const MESSAGES: Record<Locale, Messages> = { pt, en };
const STORAGE_KEY = 'locale';

/** Língua guardada; da 1.ª vez, a do telemóvel (português se for pt-*, senão inglês). */
function initialLocale(): Locale {
  try {
    const saved = SecureStore.getItem(STORAGE_KEY);
    if (saved === 'pt' || saved === 'en') return saved;
  } catch {
    // sem acesso ao armazenamento: usa a língua do sistema
  }
  return getLocales()[0]?.languageCode === 'pt' ? 'pt' : 'en';
}

type I18nValue = {
  locale: Locale;
  intlLocale: string;
  t: Messages;
  setLocale: (locale: Locale) => void;
  /** Mensagem de erro na língua atual (a API responde em português). */
  errorMessage: (err: unknown) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = MESSAGES[locale];
    const errorMessage = (err: unknown) => {
      if (!(err instanceof ApiError)) return t.errors.generic;
      if (err.status === 0) return t.errors.network;
      // Em português, as mensagens da API são específicas e úteis: usam-se tal como vêm.
      if (locale === 'pt') return err.message;
      const byStatus: Record<number, string> = {
        400: t.errors.invalid,
        404: t.errors.notFound,
        422: t.errors.invalidImage,
        429: t.errors.tooMany,
        502: t.errors.badGateway,
        503: t.errors.unavailable,
      };
      return byStatus[err.status] ?? t.errors.generic;
    };
    return { locale, intlLocale: INTL[locale], t, setLocale, errorMessage };
  }, [locale, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n() tem de estar dentro de <I18nProvider>');
  return ctx;
}
