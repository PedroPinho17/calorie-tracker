import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { IsNull, Like, type DataSource } from 'typeorm';
import { Food, PasswordReset } from '@repo/db';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup.js';
import { MailService, type Mail } from '../src/mail/mail.service.js';

/**
 * Precisa da BD do docker-compose a correr. Usa a BD "<nome>_test" (ver vitest.config.e2e.ts).
 * Cada execução cria utilizadores com emails únicos, por isso pode correr várias vezes.
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  const run = randomUUID().slice(0, 8);
  const alice = { email: `alice-${run}@example.com`, password: 'password-da-alice' };
  const bob = { email: `bob-${run}@example.com`, password: 'password-do-bob!' };
  let asAlice: ReturnType<typeof request.agent>;
  let asBob: ReturnType<typeof request.agent>;
  // Alimento já guardado na BD (como se tivesse vindo de uma pesquisa USDA).
  const egg = {
    source: 'usda' as const,
    externalId: `e2e-${run}`,
    name: 'Egg, whole, raw',
    kcalPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
  };

  // Emails "enviados" ficam aqui em vez de irem para o Resend.
  const sentMail = vi.fn<(mail: Mail) => Promise<void>>(async () => {});

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({ send: sentMail })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    db = app.get(getDataSourceToken());
    await db.getRepository(Food).insert(egg);

    asAlice = request.agent(app.getHttpServer());
    asBob = request.agent(app.getHttpServer());
    await asAlice.post('/auth/register').send(alice).expect(201);
    await asBob.post('/auth/register').send(bob).expect(201);
  });

  afterAll(async () => {
    await db?.query(`DELETE FROM users WHERE email LIKE $1`, [`%-${run}@example.com`]);
    await db?.getRepository(Food).delete({ externalId: egg.externalId });
    await app?.close();
  });

  describe('autenticação', () => {
    it('rotas de dados exigem login', async () => {
      const http = request(app.getHttpServer());
      await http.get('/meals/day?date=2000-01-01').expect(401);
      await http.get('/goals').expect(401);
      await http.post('/vision/analyze').expect(401);
      await http.get('/auth/me').expect(401);
    });

    it('/health é público', () => request(app.getHttpServer()).get('/health').expect(200));

    it('o cookie de sessão é httpOnly e SameSite', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(alice)
        .expect(200);
      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(res.body).toEqual({ id: expect.any(String), email: alice.email });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('GET /auth/me devolve o utilizador da sessão', async () => {
      const res = await asAlice.get('/auth/me').expect(200);
      expect(res.body.email).toBe(alice.email);
    });

    it('não deixa registar o mesmo email duas vezes (nem com maiúsculas)', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...alice, email: alice.email.toUpperCase() })
        .expect(409));

    it('rejeita passwords curtas', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `short-${run}@example.com`, password: 'curta' })
        .expect(400));

    it('cookie inventado não dá acesso', () =>
      request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `sid=${'A'.repeat(43)}`)
        .expect(401));

    it('logout invalida a sessão', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/auth/login').send(bob).expect(200);
      await agent.get('/auth/me').expect(200);
      await agent.post('/auth/logout').expect(204);
      await agent.get('/auth/me').expect(401);
    });
  });

  describe('app mobile (token Bearer)', () => {
    const carol = { email: `carol-${run}@example.com`, password: 'password-da-carol' };
    let token: string;
    const http = () => request(app.getHttpServer());

    it('registo devolve { user, token } e não põe cookies', async () => {
      const res = await http().post('/auth/mobile/register').send(carol).expect(201);
      expect(res.body.user).toEqual({ id: expect.any(String), email: carol.email });
      expect(res.body.token).toMatch(/^[\w-]{43}$/);
      expect(res.headers['set-cookie']).toBeUndefined();
      token = res.body.token;
    });

    it('o token dá acesso aos dados da própria conta', async () => {
      const me = await http().get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
      expect(me.body.email).toBe(carol.email);
      // Isolamento: não vê as refeições de mais ninguém.
      const day = await http().get('/meals/day?date=2001-01-01').set('Authorization', `Bearer ${token}`).expect(200);
      expect(day.body.meals).toEqual([]);
    });

    it('tokens inventados ou mal formados dão 401', async () => {
      await http().get('/auth/me').set('Authorization', `Bearer ${'A'.repeat(43)}`).expect(401);
      await http().get('/auth/me').set('Authorization', 'Bearer ../../etc').expect(401);
      await http().get('/auth/me').set('Authorization', token).expect(401); // sem "Bearer "
    });

    it('login com password errada dá 401; com a certa devolve um token novo', async () => {
      await http().post('/auth/mobile/login').send({ ...carol, password: 'errada-errada' }).expect(401);
      const res = await http().post('/auth/mobile/login').send(carol).expect(200);
      expect(res.body.token).not.toBe(token);
    });

    it('logout invalida o token no servidor', async () => {
      await http().post('/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
      await http().get('/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('segurança HTTP', () => {
    it('envia headers de segurança', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('bloqueia pedidos cross-site que alteram dados (CSRF)', () =>
      asAlice
        .put('/goals')
        .set('Origin', 'https://evil.example')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ kcal: 1000, protein: 1, carbs: 1, fat: 1 })
        .expect(403));

    it('aceita pedidos da origem da web', () =>
      asAlice
        .get('/goals')
        .set('Origin', 'http://localhost:3000')
        .expect(200)
        .expect('access-control-allow-credentials', 'true'));
  });

  describe('refeições', () => {
    it('GET /meals/day rejeita datas inválidas', () => asAlice.get('/meals/day?date=ontem').expect(400));

    it('POST /meals rejeita corpo inválido', () =>
      asAlice.post('/meals').send({ date: '2026-01-01', type: 'brunch', items: [] }).expect(400));

    it('usa os valores nutricionais da BD, não os enviados pelo cliente', async () => {
      const forged = { ...egg, kcalPer100g: 1, proteinPer100g: 99 };
      const res = await asAlice
        .post('/meals')
        .send({ date: '2001-01-01', type: 'lunch', items: [{ grams: 200, picked: forged }] })
        .expect(201);
      expect(res.body.items[0]).toMatchObject({ kcal: 286, protein: 25.2 });

      const food = await db.getRepository(Food).findOneByOrFail({ externalId: egg.externalId });
      expect(food.kcalPer100g).toBe(143);
    });

    it('rejeita alimentos "custom" ou ids inventados', () =>
      asAlice
        .post('/meals')
        .send({
          date: '2001-01-01',
          type: 'lunch',
          items: [{ grams: 100, picked: { ...egg, source: 'custom', externalId: '../../x' } }],
        })
        .expect(400));

    it('cada utilizador só vê e apaga as suas refeições', async () => {
      const day = await asAlice.get('/meals/day?date=2001-01-01').expect(200);
      expect(day.body.meals).toHaveLength(1);
      expect(day.body.meals[0]).not.toHaveProperty('userId');
      const mealId = day.body.meals[0].id;

      const bobDay = await asBob.get('/meals/day?date=2001-01-01').expect(200);
      expect(bobDay.body).toEqual({
        date: '2001-01-01',
        meals: [],
        total: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      });
      const bobRecent = await asBob.get('/meals/recent').expect(200);
      expect(bobRecent.body).toEqual([]);

      await asBob.delete(`/meals/${mealId}`).expect(404);
      await asAlice.delete(`/meals/${mealId}`).expect(204);
    });
  });

  describe('metas', () => {
    it('são por utilizador', async () => {
      const goal = { kcal: 1800, protein: 150, carbs: 150, fat: 60, waterMl: 2500 };
      await asAlice.put('/goals').send(goal).expect(200, goal);
      const bobGoal = await asBob.get('/goals').expect(200);
      expect(bobGoal.body).toEqual({ kcal: 2000, protein: 120, carbs: 220, fat: 65, waterMl: 2000 });
    });

    it('a meta de água é opcional (clientes antigos não a enviam)', async () => {
      const res = await asAlice.put('/goals').send({ kcal: 1900, protein: 150, carbs: 150, fat: 60 }).expect(200);
      expect(res.body.waterMl).toBe(2500);
    });
  });

  describe('pesquisa de alimentos', () => {
    // Alimentos "INSA" de teste com uma palavra única, para não depender dos dados importados.
    const tag = `zq${run.replace(/[^a-z0-9]/g, '')}`;
    beforeAll(async () => {
      // Sem "...egg": o insert do TypeORM acrescenta o id ao objeto original.
      const per100g = { kcalPer100g: 150, proteinPer100g: 12, carbsPer100g: 1, fatPer100g: 10 };
      await db.getRepository(Food).insert([
        { ...per100g, source: 'insa', externalId: `${tag}-1`, name: `Ovo de galinha cozido ${tag}` },
        { ...per100g, source: 'insa', externalId: `${tag}-2`, name: `Bacalhau cozido ${tag}` },
      ]);
    });
    afterAll(() => db.getRepository(Food).delete({ source: 'insa', name: Like(`%${tag}`) }));

    it('encontra com as palavras por qualquer ordem e sem acentos', async () => {
      for (const q of [`ovo cozido ${tag}`, `${tag} cozido ovo`, `OVO cozido ${tag}`]) {
        const res = await asAlice.get(`/foods/search?q=${encodeURIComponent(q)}`).expect(200);
        expect(res.body[0]).toMatchObject({ source: 'insa', name: `Ovo de galinha cozido ${tag}` });
      }
    });

    it('aguenta erros de escrita', async () => {
      const res = await asAlice.get(`/foods/search?q=${encodeURIComponent(`bacalao ${tag}`)}`).expect(200);
      expect(res.body[0]).toMatchObject({ name: `Bacalhau cozido ${tag}` });
    });
  });

  describe('corrigir refeições já guardadas', () => {
    let mealId: string;
    let itemId: string;
    beforeAll(async () => {
      const res = await asAlice
        .post('/meals')
        .send({ date: '2002-02-02', type: 'dinner', items: [{ grams: 100, picked: egg }] })
        .expect(201);
      mealId = res.body.id;
      itemId = res.body.items[0].id;
    });

    it('muda as gramas e recalcula os macros', async () => {
      const res = await asAlice.patch(`/meals/${mealId}/items/${itemId}`).send({ grams: 50 }).expect(200);
      expect(res.body.items[0]).toMatchObject({ grams: 50, kcal: 72 });
    });

    it('não deixa mexer na refeição de outra pessoa', () =>
      asBob.patch(`/meals/${mealId}/items/${itemId}`).send({ grams: 500 }).expect(404));

    it('pede gramas ou alimento', () => asAlice.patch(`/meals/${mealId}/items/${itemId}`).send({}).expect(400));
  });

  describe('água', () => {
    it('soma os copos do dia, só da própria conta, e deixa desfazer', async () => {
      await asAlice.post('/water').send({ date: '2003-03-03', ml: 250 }).expect(201);
      const day = await asAlice.post('/water').send({ date: '2003-03-03', ml: 500 }).expect(201);
      expect(day.body.totalMl).toBe(750);
      expect(day.body.entries).toHaveLength(2);

      const bob = await asBob.get('/water?date=2003-03-03').expect(200);
      expect(bob.body.totalMl).toBe(0);
      await asBob.delete(`/water/${day.body.entries[0].id}`).expect(404);

      const after = await asAlice.delete(`/water/${day.body.entries[1].id}`).expect(200);
      expect(after.body.totalMl).toBe(250);
    });

    it('rejeita quantidades absurdas', () => asAlice.post('/water').send({ date: '2003-03-03', ml: 99999 }).expect(400));
  });

  describe('peso', () => {
    it('um registo por dia: registar outra vez substitui', async () => {
      const today = new Date().toISOString().slice(0, 10);
      await asAlice.put('/weight').send({ date: today, kg: 80.5 }).expect(200, { date: today, kg: 80.5 });
      await asAlice.put('/weight').send({ date: today, kg: 79.9 }).expect(200);
      const list = await asAlice.get('/weight?days=30').expect(200);
      expect(list.body).toEqual([{ date: today, kg: 79.9 }]);

      expect((await asBob.get('/weight').expect(200)).body).toEqual([]);
      await asAlice.delete(`/weight/${today}`).expect(204);
      expect((await asAlice.get('/weight').expect(200)).body).toEqual([]);
    });

    it('rejeita pesos absurdos', () =>
      asAlice.put('/weight').send({ date: '2003-03-03', kg: 5 }).expect(400));
  });

  it('POST /vision/analyze sem foto devolve 422', () => asAlice.post('/vision/analyze').expect(422));

  // Depois dos outros testes: a recuperação muda a password da Alice e termina as sessões dela.
  // Cada endpoint aceita só 5 pedidos/min por IP, por isso os testes reaproveitam os tokens.
  describe('recuperação de password', () => {
    const http = () => request(app.getHttpServer());
    const newPassword = 'nova-password-da-alice';
    /** Pede o link e devolve o token que foi no email. */
    async function requestToken(email: string, locale = 'pt') {
      sentMail.mockClear();
      await http().post('/auth/forgot-password').send({ email, locale }).expect(202, { ok: true });
      await vi.waitFor(() => expect(sentMail).toHaveBeenCalledTimes(1));
      const mail = sentMail.mock.calls[0]![0];
      expect(mail.to).toBe(email);
      return { mail, token: /#token=([\w-]{43})$/.exec(mail.devPreview ?? '')![1]! };
    }

    it('responde igual para emails sem conta e não envia nada', async () => {
      sentMail.mockClear();
      await http()
        .post('/auth/forgot-password')
        .send({ email: `ninguem-${run}@example.com` })
        .expect(202, { ok: true });
      // O pedido é tratado em segundo plano: dá-lhe tempo antes de confirmar que nada saiu.
      await new Promise((r) => setTimeout(r, 300));
      expect(sentMail).not.toHaveBeenCalled();
    });

    it('email na língua pedida; só o link mais recente vale; links expirados não', async () => {
      const first = await requestToken(bob.email, 'en');
      expect(first.mail.subject).toMatch(/Reset your password/);
      expect(first.mail.html).toContain('http://localhost:3000/reset-password#token=');

      const second = await requestToken(bob.email);
      expect(second.mail.subject).toMatch(/Recupera a tua password/);
      await http()
        .post('/auth/reset-password')
        .send({ token: first.token, password: 'qualquer-coisa-longa' })
        .expect(400);

      await db
        .getRepository(PasswordReset)
        .update({ usedAt: IsNull() }, { expiresAt: new Date(Date.now() - 1000) });
      await http()
        .post('/auth/reset-password')
        .send({ token: second.token, password: 'qualquer-coisa-longa' })
        .expect(400);
    });

    it('muda a password, entra e termina as outras sessões', async () => {
      await asAlice.get('/auth/me').expect(200);
      const { token } = await requestToken(alice.email);

      // Password curta: recusada, e o link continua válido.
      await http().post('/auth/reset-password').send({ token, password: 'curta' }).expect(400);

      const agent = request.agent(app.getHttpServer());
      const res = await agent.post('/auth/reset-password').send({ token, password: newPassword }).expect(200);
      expect(res.body.email).toBe(alice.email);
      await agent.get('/auth/me').expect(200);

      await asAlice.get('/auth/me').expect(401); // sessão antiga terminada
      await http().post('/auth/login').send(alice).expect(401); // password antiga já não serve
      await http().post('/auth/login').send({ ...alice, password: newPassword }).expect(200);

      // O mesmo link não pode ser usado duas vezes.
      await http().post('/auth/reset-password').send({ token, password: 'outra-password-qualquer' }).expect(400);
    });
  });

  // Fica no fim: esgota o limite de tentativas de login deste IP.
  it('limita tentativas de login (força bruta)', async () => {
    const http = request(app.getHttpServer());
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await http.post('/auth/login').send({ ...alice, password: 'errada-errada' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
    expect(statuses.filter((s) => s !== 429).every((s) => s === 401)).toBe(true);
  });
});
