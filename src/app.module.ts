import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';

import { ApiModule } from './api/api.module';
import { HealthController } from './api/health/health.controller';
import { AuthModule } from './auth/auth.module';
import configuration from './libs/config/configuration';
import { CryptoModule } from './libs/crypto/crypto.module';
import { NotFoundFilter } from './libs/filters/NotFoundFilter';
import { GraphqlModule } from './libs/graphql/graphql.module';
import { CustomLoggerModule } from './libs/logging/logger.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { RedisModule } from './libs/redis/redis.module';

@Module({
  imports: [
    // API
    ApiModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1_000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10_000,
        limit: 40,
      },
      {
        name: 'long',
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Auth
    AuthModule,

    // Database
    PrismaModule,

    // GraphQL
    GraphqlModule,

    // Caching
    RedisModule,

    // Health
    TerminusModule,

    // Crypto
    CryptoModule,

    // Config
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Logger
    CustomLoggerModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: NotFoundFilter,
    },
  ],
})
export class AppModule {}
