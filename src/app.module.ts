import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './libs/prisma/prisma.module';
import { GraphqlModule } from './libs/graphql/graphql.module';
import { GeneralModule } from './api/general/general.module';
import { CustomLoggerModule } from './libs/logging/logger.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // API
    GeneralModule,

    // Database
    PrismaModule,

    // GraphQL
    GraphqlModule,

    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Logger
    CustomLoggerModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
