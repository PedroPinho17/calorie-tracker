import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from './config.js';

/**
 * Configuração HTTP partilhada por main.ts e pelos testes e2e,
 * para os testes correrem com as mesmas proteções que produção.
 */
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const origins = config.get('WEB_ORIGIN', { infer: true });

  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy > 0) (app as NestExpressApplication).set('trust proxy', trustProxy);

  // Headers de segurança (iguais ao helmet). A API só devolve JSON, por isso a CSP pode ser mínima.
  app.useSecurityHeaders({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    // A web (outra porta/subdomínio) lê as respostas via CORS.
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  // CSRF por Fetch Metadata: pedidos que alteram dados só vindos da própria web.
  app.enableCsrfProtection({ trustedOrigins: origins });

  // Valida @Body/@Query/@Param que declarem { schema } (zod, de @repo/shared).
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  // credentials: o browser envia o cookie de sessão nos pedidos da web.
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();
  return app;
}
