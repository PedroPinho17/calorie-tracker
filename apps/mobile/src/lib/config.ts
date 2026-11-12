/**
 * Endereço da API, definido no build (EXPO_PUBLIC_API_URL no .env ou no perfil do eas.json).
 *
 * Fora do modo de desenvolvimento exige HTTPS: por HTTP o token de sessão e as fotos
 * passariam em claro pela rede. Builds internos de teste numa rede local podem abrir uma
 * exceção com EXPO_PUBLIC_ALLOW_INSECURE_API=true (ver eas.json → preview).
 */
const raw = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_URL = raw ? raw.replace(/\/+$/, '') : null;

const allowInsecure = __DEV__ || process.env.EXPO_PUBLIC_ALLOW_INSECURE_API === 'true';

/** Mensagem de erro de configuração (mostrada em vez da app), ou null se estiver tudo bem. */
export function configError(): string | null {
  if (!API_URL) return 'EXPO_PUBLIC_API_URL não está definido (apps/mobile/.env).';
  if (!/^https?:\/\//.test(API_URL)) return 'EXPO_PUBLIC_API_URL tem de começar por http:// ou https://.';
  if (!allowInsecure && !API_URL.startsWith('https://')) {
    return 'Em produção a API tem de usar HTTPS.';
  }
  return null;
}
