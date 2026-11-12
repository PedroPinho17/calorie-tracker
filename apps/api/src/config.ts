import { z } from 'zod';

/**
 * Variáveis de ambiente validadas no arranque (ConfigModule.validate).
 * Se faltar alguma obrigatória, a API nem arranca — em vez de falhar mais tarde.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Origens da web (separadas por vírgula) — usadas no CORS e na proteção CSRF. */
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-2.5-flash'),
  USDA_API_KEY: z.string().default('DEMO_KEY'),
  // Só para protótipos: true cria/altera tabelas sozinho. Por defeito usamos migrations.
  DB_SYNCHRONIZE: z.stringbool().default(false),

  // --- Autenticação ---
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** Cookie só por HTTPS. Por defeito ligado em produção. */
  COOKIE_SECURE: z.stringbool().optional(),
  /** Desliga depois de criares a tua conta, se a API estiver exposta na internet. */
  ALLOW_REGISTRATION: z.stringbool().default(true),
  /** Nº de proxies à frente da API (ex.: 1 atrás de nginx) para o rate limit ver o IP real. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // --- Email (recuperação de password) via Resend: https://resend.com/api-keys ---
  /** Sem chave: em desenvolvimento o link aparece no terminal da API; em produção não é enviado. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** onboarding@resend.dev só entrega no email da tua conta Resend — usa um domínio teu depois. */
  MAIL_FROM: z.string().min(3).default('Calorie Tracker <onboarding@resend.dev>'),
}).transform((env) => ({
  ...env,
  COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
}));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Configuração inválida no .env:\n${z.prettifyError(result.error)}`);
  }
  if (result.data.NODE_ENV === 'production' && result.data.DB_SYNCHRONIZE) {
    throw new Error('DB_SYNCHRONIZE=true não é permitido em produção (pode apagar dados).');
  }
  return result.data;
}
