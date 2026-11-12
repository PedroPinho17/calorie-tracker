import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('aceita a password certa e rejeita outras', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(hash).not.toContain('correct horse battery');
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(true);
    await expect(verifyPassword('correct horse batterY', hash)).resolves.toBe(false);
  });

  it('usa um salt diferente em cada hash', async () => {
    expect(await hashPassword('mesma password')).not.toBe(await hashPassword('mesma password'));
  });

  it('rejeita hashes em formato desconhecido', async () => {
    await expect(verifyPassword('x', 'md5$abc')).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
  });
});
