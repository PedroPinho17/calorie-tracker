import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { CookieOptions, Request, Response } from 'express';
import { DataSource, IsNull, LessThan, MoreThan, QueryFailedError, Repository } from 'typeorm';
import { FoodAlias, Goal, Meal, PasswordReset, Session, User } from '@repo/db';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserDto,
} from '@repo/shared';
import type { Env } from '../config.js';
import { MailService } from '../mail/mail.service.js';
import { dummyPasswordHash, hashPassword, verifyPassword } from './password.js';
import { resetPasswordEmail } from './reset-email.js';

/** Validade do link de recuperação. */
export const RESET_TTL_MINUTES = 30;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const toDto = (u: Pick<User, 'id' | 'email'>): UserDto => ({ id: u.id, email: u.email });

/** Tokens de sessão: 32 bytes aleatórios em base64url = 43 caracteres. */
const TOKEN_RE = /^[\w-]{43}$/;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ttlMs: number;
  /** Página da web que recebe o link de recuperação (1.ª origem de WEB_ORIGIN). */
  private readonly webUrl: string;
  private readonly secure: boolean;
  private readonly allowRegistration: boolean;
  /** "__Host-" obriga a Secure + Path=/ + sem Domain (o browser recusa o cookie se não for assim). */
  readonly cookieName: string;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.webUrl = config.get('WEB_ORIGIN', { infer: true })[0]!;
    this.ttlMs = config.get('SESSION_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
    this.secure = config.get('COOKIE_SECURE', { infer: true });
    this.allowRegistration = config.get('ALLOW_REGISTRATION', { infer: true });
    this.cookieName = this.secure ? '__Host-sid' : 'sid';
  }

  async register({ email, password }: RegisterInput): Promise<User> {
    if (!this.allowRegistration) {
      throw new ForbiddenException('O registo de novas contas está desativado.');
    }
    const passwordHash = await hashPassword(password);

    try {
      return await this.db.transaction(async (m) => {
        const user = await m.save(m.create(User, { email, passwordHash }));
        // Dados de antes de existir login ficam para o 1.º utilizador (o dono da instalação).
        if ((await m.count(User)) === 1) {
          for (const entity of [Meal, Goal, FoodAlias]) {
            await m.update(entity, { userId: IsNull() }, { userId: user.id });
          }
        }
        return user;
      });
    } catch (err) {
      // 23505 = unique_violation (email já registado)
      if (err instanceof QueryFailedError && (err.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('Já existe uma conta com este email.');
      }
      throw err;
    }
  }

  async login({ email, password }: LoginInput): Promise<User> {
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
    // Verifica sempre um hash (mesmo sem utilizador) para o tempo de resposta não revelar contas.
    const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !ok) throw new UnauthorizedException('Email ou password incorretos.');
    return user;
  }

  /**
   * Pedido de recuperação. Não espera por nada: procurar a conta, gravar o token e enviar o
   * email correm em segundo plano, para nem o conteúdo nem o tempo da resposta revelarem
   * se o email tem conta. Qualquer erro (BD ou email) fica no log — nunca chega ao cliente
   * nem fica como promise rejeitada sem tratamento (o que terminaria o processo).
   */
  requestPasswordReset(input: ForgotPasswordInput): void {
    this.processPasswordReset(input).catch((err: unknown) =>
      this.logger.error('Falhou o pedido de recuperação de password', err as Error),
    );
  }

  private async processPasswordReset({ email, locale }: ForgotPasswordInput): Promise<void> {
    const user = await this.users.findOneBy({ email });
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await this.db.transaction(async (m) => {
      // Só o link mais recente é válido; limpa também pedidos antigos expirados.
      await m.delete(PasswordReset, { userId: user.id });
      await m.delete(PasswordReset, { expiresAt: LessThan(new Date()) });
      await m.insert(PasswordReset, {
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      });
    });

    // Fragmento (#): o token não vai para logs de servidores nem no Referer.
    const link = `${this.webUrl}/reset-password#token=${token}`;
    await this.mail.send(resetPasswordEmail(user.email, link, locale, RESET_TTL_MINUTES));
  }

  /** Troca a password com um token válido; termina todas as sessões abertas dessa conta. */
  async resetPassword({ token, password }: ResetPasswordInput): Promise<User> {
    const passwordHash = await hashPassword(password);

    return this.db.transaction(async (m) => {
      // Marca como usado de forma atómica: dois pedidos com o mesmo token não passam os dois.
      const result = await m
        .createQueryBuilder()
        .update(PasswordReset)
        .set({ usedAt: () => 'now()' })
        .where('"tokenHash" = :hash AND "usedAt" IS NULL AND "expiresAt" > now()', { hash: sha256(token) })
        .returning(['userId'])
        .execute();
      const userId = (result.raw as { userId: string }[])[0]?.userId;
      if (!userId) {
        throw new BadRequestException('Este link é inválido ou já expirou. Pede um novo.');
      }

      await m.update(User, { id: userId }, { passwordHash });
      await m.delete(Session, { userId });
      await m.delete(PasswordReset, { userId });
      return m.findOneByOrFail(User, { id: userId });
    });
  }

  /** Cria a sessão e põe o cookie httpOnly na resposta. */
  async startSession(user: User, res: Response): Promise<UserDto> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) }); // limpeza oportunista
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({ tokenHash: sha256(token), userId: user.id, expiresAt });
    res.cookie(this.cookieName, token, { ...this.cookieOptions(), expires: expiresAt });
    return toDto(user);
  }

  /** Igual a startSession, mas para a app mobile: devolve o token em vez de pôr um cookie. */
  async startTokenSession(user: User): Promise<{ user: UserDto; token: string }> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({ tokenHash: sha256(token), userId: user.id, expiresAt });
    return { user: toDto(user), token };
  }

  async endSession(tokenHash: string | undefined, res: Response) {
    if (tokenHash) await this.sessions.delete({ tokenHash });
    res.clearCookie(this.cookieName, this.cookieOptions());
  }

  async validate(token: string): Promise<{ user: UserDto; tokenHash: string } | null> {
    const tokenHash = sha256(token);
    const session = await this.sessions.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
    return session ? { user: toDto(session.user), tokenHash } : null;
  }

  /** Lê o token do Authorization Bearer ou do cookie de sessão. */
  readToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const value = auth.slice(7).trim();
      return TOKEN_RE.test(value) ? value : null;
    }
    for (const part of (req.headers.cookie ?? '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === this.cookieName) {
        const value = part.slice(i + 1).trim();
        return TOKEN_RE.test(value) ? value : null;
      }
    }
    return null;
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/' };
  }
}
