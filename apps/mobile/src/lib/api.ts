import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import type {
  Analysis,
  CreateMealInput,
  DaySummary,
  GoalInput,
  HistoryDay,
  LoginInput,
  MealDto,
  MobileSession,
  PickedFood,
  RecentFood,
  RegisterInput,
  UpdateMealItemInput,
  UserDto,
  WaterDay,
  WeightEntry,
} from '@repo/shared';
import { API_URL } from './config';

const TOKEN_KEY = 'token';
const DEFAULT_TIMEOUT_MS = 20_000;
// A análise de fotos espera pelo Gemini (com tentativas): precisa de mais tempo.
const ANALYZE_TIMEOUT_MS = 90_000;

export class ApiError extends Error {
  constructor(
    message: string,
    /** 0 = sem resposta (sem rede, API em baixo, timeout). */
    readonly status: number,
  ) {
    super(message);
  }
}

// --- Token de sessão: só no SecureStore (Keychain / Keystore), nunca em AsyncStorage. ---

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
const setToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

/** Chamado quando a API responde 401 (sessão expirada ou terminada noutro sítio). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const token = await getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    if (__DEV__) console.warn(`[api] ${init.method ?? 'GET'} ${path} falhou sem resposta:`, err);
    throw new ApiError('Não foi possível ligar à API.', 0);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && token && !path.startsWith('/auth/mobile/')) {
    await clearToken();
    onUnauthorized?.();
  }
  if (!res.ok) {
    // O Nest devolve { message } (string ou lista) nos erros.
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message ?? `Pedido falhou (${res.status})`, res.status);
  }
  return (res.status === 204 || res.status === 202 ? undefined : await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

// --- Autenticação ---

export async function login(input: LoginInput) {
  const session = await request<MobileSession>('/auth/mobile/login', json('POST', input));
  await setToken(session.token);
  return session.user;
}

export async function register(input: RegisterInput) {
  const session = await request<MobileSession>('/auth/mobile/register', json('POST', input));
  await setToken(session.token);
  return session.user;
}

export const forgotPassword = (email: string, locale: 'pt' | 'en') =>
  request<void>('/auth/forgot-password', json('POST', { email, locale }));

/** Utilizador da sessão guardada, ou null se não houver sessão válida. */
export async function me(): Promise<UserDto | null> {
  if (!(await getToken())) return null;
  try {
    return await request<UserDto>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** Termina a sessão no servidor e apaga o token, mesmo que o servidor não responda. */
export async function logout() {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } catch {
    // sem rede: a sessão expira sozinha no servidor
  } finally {
    await clearToken();
  }
}

// --- Dados ---

export function analyzePhoto(uri: string) {
  const form = new FormData();
  // O fetch do Expo (expo/fetch) não aceita o formato antigo { uri, name, type } do React Native
  // ("Unsupported FormDataPart implementation"): precisa de um Blob. O File do expo-file-system é um.
  form.append('photo', new File(uri) as unknown as Blob, 'photo.jpg');
  return request<Analysis>('/vision/analyze', { method: 'POST', body: form, timeoutMs: ANALYZE_TIMEOUT_MS });
}

export const searchFoods = (q: string) =>
  request<PickedFood[]>(`/foods/search?q=${encodeURIComponent(q)}`);

export const foodByBarcode = (code: string) =>
  request<PickedFood>(`/foods/barcode/${encodeURIComponent(code)}`);

export const confirmFood = (alias: string, picked: PickedFood) =>
  request<PickedFood>('/foods/confirm', json('POST', { alias, picked }));

export const saveMeal = (input: CreateMealInput) => request<MealDto>('/meals', json('POST', input));

export const getDay = (date: string) =>
  request<DaySummary>(`/meals/day?date=${encodeURIComponent(date)}`);

export const getHistory = (end: string, days = 7) =>
  request<HistoryDay[]>(`/meals/history?end=${encodeURIComponent(end)}&days=${days}`);

export const getRecent = () => request<RecentFood[]>('/meals/recent');

export const deleteMeal = (id: string) =>
  request<void>(`/meals/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getGoal = () => request<GoalInput>('/goals');

export const updateGoal = (goal: GoalInput) => request<GoalInput>('/goals', json('PUT', goal));

export const updateMealItem = (mealId: string, itemId: string, input: UpdateMealItemInput) =>
  request<MealDto>(`/meals/${encodeURIComponent(mealId)}/items/${encodeURIComponent(itemId)}`, json('PATCH', input));

export const getWater = (date: string) => request<WaterDay>(`/water?date=${encodeURIComponent(date)}`);

export const addWater = (date: string, ml: number) => request<WaterDay>('/water', json('POST', { date, ml }));

export const deleteWater = (id: string) =>
  request<WaterDay>(`/water/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getWeights = (days = 90) => request<WeightEntry[]>(`/weight?days=${days}`);

export const saveWeight = (date: string, kg: number) => request<WeightEntry>('/weight', json('PUT', { date, kg }));
