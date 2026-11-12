import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

/**
 * Os e2e usam uma BD própria (nunca a de desenvolvimento): TEST_DATABASE_URL ou,
 * por defeito, a DATABASE_URL do .env com "_test" no nome da BD.
 * Criar uma vez: docker compose exec postgres createdb -U calorie calorie_tracker_test
 */
function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  let env: Record<string, string | undefined> = {};
  try {
    env = parseEnv(readFileSync(new URL('../../.env', import.meta.url), 'utf8'));
  } catch {
    // sem .env → só as variáveis de ambiente
  }
  const base = process.env.DATABASE_URL ?? env.DATABASE_URL;
  if (!base) throw new Error('Define TEST_DATABASE_URL ou DATABASE_URL para correr os e2e.');
  const url = new URL(base);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

const databaseUrl = testDatabaseUrl();
if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Por segurança, os e2e só correm numa BD cujo nome acaba em "_test".');
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // O hash scrypt é propositadamente lento.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'test-key',
      ALLOW_REGISTRATION: 'true',
    },
  },
});
