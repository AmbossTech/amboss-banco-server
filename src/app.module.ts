import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './libs/prisma/prisma.module';
import { GraphqlModule } from './libs/graphql/graphql.module';
import { CustomLoggerModule } from './libs/logging/logger.module';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import configuration from './libs/config/configuration';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './libs/redis/redis.module';
import { HealthController } from './api/health/health.controller';
import { TerminusModule } from '@nestjs/terminus';

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

    // Config
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Logger
    CustomLoggerModule.forRoot(),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
