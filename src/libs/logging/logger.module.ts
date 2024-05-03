import { DynamicModule, Global, Module } from '@nestjs/common';

import { createLoggerProviders } from './logger.provider';
import { CustomLogger } from './logger.service';

// https://dev.to/nestjs/advanced-nestjs-dynamic-providers-1ee
const loggerProviders = createLoggerProviders();

@Global()
@Module({
  providers: [CustomLogger, ...loggerProviders],
  exports: [CustomLogger, ...loggerProviders],
})
export class CustomLoggerModule {
  static forRoot(): DynamicModule {
    const prefixedLoggerProviders = createLoggerProviders();
    return {
      module: CustomLoggerModule,
      providers: [CustomLogger, ...prefixedLoggerProviders],
      exports: [CustomLogger, ...prefixedLoggerProviders],
    };
  }
}
