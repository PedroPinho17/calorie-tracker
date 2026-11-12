import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC, type AuthedRequest } from './auth.decorators.js';

/** Guard global: exige um cookie de sessão válido, exceto em rotas @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token = this.auth.readToken(req);
    const session = token ? await this.auth.validate(token) : null;
    if (!session) throw new UnauthorizedException('Sessão inválida ou expirada. Faz login.');

    req.user = session.user;
    req.sessionTokenHash = session.tokenHash;
    return true;
  }
}
