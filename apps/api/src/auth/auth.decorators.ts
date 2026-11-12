import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserDto } from '@repo/shared';

export const IS_PUBLIC = 'isPublic';

/** Rota acessível sem login (o AuthGuard é global: tudo o resto exige sessão). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AuthedRequest = Request & { user?: UserDto; sessionTokenHash?: string };

/** Utilizador da sessão atual (posto no pedido pelo AuthGuard). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UserDto => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new Error('@CurrentUser() usado numa rota @Public()');
  return user;
});
