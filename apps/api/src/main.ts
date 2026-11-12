import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';
import type { Env } from './config.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // O Node fecha ligações keep-alive inativas ao fim de 5s. O iOS reutiliza essas ligações
  // já fechadas e o POST falha sem resposta ("Não foi possível ligar à API"), sobretudo no
  // upload de fotos, que chega uns segundos depois do pedido anterior.
  // O valor fica acima dos ~60s que os clientes mantêm a ligação aberta.
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}
await bootstrap();
