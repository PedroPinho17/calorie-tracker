import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { FoodsModule } from './foods/foods.module.js';
import { VisionModule } from './vision/vision.module.js';
import { MealsModule } from './meals/meals.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { WaterModule } from './water/water.module.js';
import { WeightModule } from './weight/weight.module.js';
import { HealthController } from './health.controller.js';
import { validateEnv, type Env } from './config.js';
import { entities, migrations } from './data-source.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env', validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const synchronize = config.get('DB_SYNCHRONIZE', { infer: true });
        return {
          type: 'postgres',
          url: config.get('DATABASE_URL', { infer: true }),
          entities,
          migrations,
          synchronize,
          // Com migrations, aplica as pendentes ao arrancar.
          migrationsRun: !synchronize,
        };
      },
    }),
    // Limite global por IP; rotas sensíveis (login, fotos) têm limites próprios com @Throttle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    AuthModule,
    FoodsModule,
    VisionModule,
    MealsModule,
    GoalsModule,
    WaterModule,
    WeightModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limit global (o AuthGuard global é registado no AuthModule).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
