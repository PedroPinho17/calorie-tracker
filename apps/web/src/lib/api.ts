import type {
  Analysis,
  CreateMealInput,
  DaySummary,
  MealDto,
  PickedFood,
  GoalInput,
  HistoryDay,
  LoginInput,
  RecentFood,
  RegisterInput,
  UpdateMealItemInput,
  UserDto,
  WaterDay,
  WeightEntry,
} from '@repo/shared';

const API = process.env.NEXT_PUBLIC_API_URL;

/** Evento disparado quando a API responde 401 (sessão expirou) — o AuthProvider volta ao login. */
export const UNAUTHORIZED_EVENT = 'api:unauthorized';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API) throw new Error('NEXT_PUBLIC_API_URL não está definido em apps/web/.env.local');

  let res: Response;
  try {
    // credentials: envia o cookie de sessão (httpOnly) que a API pôs no login.
    res = await fetch(`${API}${path}`, { ...init, credentials: 'include' });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    // status 0 = sem resposta (API em baixo, sem rede, CORS).
    throw new ApiError('Não foi possível ligar à API. Está a correr?', 0);
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok) {
    // O Nest devolve { message } (string ou lista) nos erros.
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message ?? `Pedido falhou (${res.status})`, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function getMe() {
  return request<UserDto>('/auth/me');
}

export function login(input: LoginInput) {
  return request<UserDto>('/auth/login', json(input));
}

export function register(input: RegisterInput) {
  return request<UserDto>('/auth/register', json(input));
}

export function forgotPassword(email: string, locale: 'pt' | 'en') {
  return request<{ ok: true }>('/auth/forgot-password', json({ email, locale }));
}

export function resetPassword(token: string, password: string) {
  return request<UserDto>('/auth/reset-password', json({ token, password }));
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' });
}

export function analyzePhoto(photo: File) {
  const form = new FormData();
  form.append('photo', photo);
  return request<Analysis>('/vision/analyze', { method: 'POST', body: form });
}

export function searchFoods(q: string, signal?: AbortSignal) {
  return request<PickedFood[]>(`/foods/search?q=${encodeURIComponent(q)}`, { signal });
}

export function getBarcode(code: string, signal?: AbortSignal) {
  return request<PickedFood>(`/foods/barcode/${encodeURIComponent(code)}`, { signal });
}

/** Ensina a app: da próxima vez que o Gemini disser `alias`, usa `picked`. */
export function confirmFood(alias: string, picked: PickedFood) {
  return request<PickedFood>('/foods/confirm', json({ alias, picked }));
}

export function createMeal(input: CreateMealInput) {
  return request<MealDto>('/meals', json(input));
}

export function deleteMeal(id: string) {
  return request<void>(`/meals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getDay(date: string) {
  return request<DaySummary>(`/meals/day?date=${encodeURIComponent(date)}`);
}

export function getGoal() {
  return request<GoalInput>('/goals');
}

export function updateGoal(goal: GoalInput) {
  return request<GoalInput>('/goals', { ...json(goal), method: 'PUT' });
}

export function getHistory(end: string, days = 7) {
  const q = new URLSearchParams({ end, days: String(days) });
  return request<HistoryDay[]>(`/meals/history?${q}`);
}

export function getRecent() {
  return request<RecentFood[]>('/meals/recent');
}

/** Troca o alimento e/ou as gramas de um alimento numa refeição já guardada. */
export function updateMealItem(mealId: string, itemId: string, input: UpdateMealItemInput) {
  return request<MealDto>(`/meals/${encodeURIComponent(mealId)}/items/${encodeURIComponent(itemId)}`, {
    ...json(input),
    method: 'PATCH',
  });
}

export function getWater(date: string) {
  return request<WaterDay>(`/water?date=${encodeURIComponent(date)}`);
}

export function addWater(date: string, ml: number) {
  return request<WaterDay>('/water', json({ date, ml }));
}

export function deleteWater(id: string) {
  return request<WaterDay>(`/water/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getWeights(days = 90) {
  return request<WeightEntry[]>(`/weight?days=${days}`);
}

export function saveWeight(date: string, kg: number) {
  return request<WeightEntry>('/weight', { ...json({ date, kg }), method: 'PUT' });
}

export function deleteWeight(date: string) {
  return request<void>(`/weight/${encodeURIComponent(date)}`, { method: 'DELETE' });
}
