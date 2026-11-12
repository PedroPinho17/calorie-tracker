import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UserDto,
} from '@repo/shared';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public, type AuthedRequest } from './auth.decorators.js';

// Contra força bruta: poucas tentativas por minuto por IP.
const STRICT = { default: { limit: 5, ttl: 60_000 } };

/**
 * Prefixo: /auth
 * - POST /auth/register  → cria conta e entra
 * - POST /auth/login     → entra (cookie de sessão httpOnly)
 * - POST /auth/logout    → termina a sessão
 * - GET  /auth/me        → utilizador atual (401 se não houver sessão)
 * - POST /auth/mobile/register, /auth/mobile/login → iguais, mas devolvem { user, token }
 * - POST /auth/forgot-password → envia o link de recuperação (resposta sempre igual)
 * - POST /auth/reset-password  → define a password nova com o token do link e entra
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.register(body), res);
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.login(body), res);
  }

  // --- App mobile: o token vai no corpo da resposta (guardado no SecureStore do telemóvel)
  // e volta no header Authorization: Bearer. Não há cookies, por isso não há CSRF.

  @Public()
  @Throttle(STRICT)
  @Post('mobile/register')
  async mobileRegister(@Body({ schema: registerSchema }) body: RegisterInput) {
    return this.auth.startTokenSession(await this.auth.register(body));
  }

  @Public()
  @Throttle(STRICT)
  @Post('mobile/login')
  @HttpCode(200)
  async mobileLogin(@Body({ schema: loginSchema }) body: LoginInput) {
    return this.auth.startTokenSession(await this.auth.login(body));
  }

  @Public()
  @Throttle(STRICT)
  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(@Body({ schema: forgotPasswordSchema }) body: ForgotPasswordInput) {
    // Responde já, exista a conta ou não; o trabalho corre em segundo plano (ver o serviço).
    this.auth.requestPasswordReset(body);
    return { ok: true };
  }

  @Public()
  @Throttle(STRICT)
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    return this.auth.startSession(await this.auth.resetPassword(body), res);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.endSession(req.sessionTokenHash, res);
  }

  @Get('me')
  me(@CurrentUser() user: UserDto): UserDto {
    return user;
  }
}
