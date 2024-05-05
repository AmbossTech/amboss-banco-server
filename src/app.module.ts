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

    // Config
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Logger
    CustomLoggerModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
