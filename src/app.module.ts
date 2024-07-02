import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { ApiModule } from './api/api.module';
import { HealthController } from './api/health/health.controller';
import { AuthModule } from './auth/auth.module';
import configuration from './libs/config/configuration';
import { CryptoModule } from './libs/crypto/crypto.module';
import { GraphqlModule } from './libs/graphql/graphql.module';
import { CustomLoggerModule } from './libs/logging/logger.module';
import { PrismaModule } from './libs/prisma/prisma.module';
import { RedisModule } from './libs/redis/redis.module';

@Module({
  imports: [
    // API
    ApiModule,

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
})
export class AppModule {}
