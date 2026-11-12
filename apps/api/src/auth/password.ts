import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Hash de passwords com scrypt (nativo do Node, sem dependências nativas).
 * Parâmetros recomendados pela OWASP: N=2^17, r=8, p=1 (~128 MiB por hash).
 * Formato guardado: scrypt$N$r$p$salt$hash (base64) — permite subir o custo no futuro.
 */
const PARAMS = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LEN = 32;
const MAX_MEM = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, opts: ScryptOptions, keyLen = KEY_LEN) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, keyLen, { ...opts, maxmem: MAX_MEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64'),
    { N: Number(n), r: Number(r), p: Number(p) },
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/**
 * Hash de uma password aleatória, usado quando o email não existe:
 * o login demora o mesmo tempo e não revela que contas existem.
 */
export function dummyPasswordHash() {
  return (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));
}
