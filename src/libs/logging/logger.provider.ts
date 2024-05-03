import { Provider } from '@nestjs/common';

import { prefixesForLoggers } from './logger.decorator';
import { CustomLogger } from './logger.service';

function loggerFactory(logger: CustomLogger, prefix: string) {
  if (prefix) {
    logger.setPrefix(prefix);
  }
  return logger;
}

function createLoggerProvider(context: string): Provider<CustomLogger> {
  return {
    provide: `LoggerService${context}`,
    useFactory: (logger) => loggerFactory(logger, context),
    inject: [CustomLogger],
  };
}

export function createLoggerProviders(): Array<Provider<CustomLogger>> {
  return prefixesForLoggers.map((prefix) => createLoggerProvider(prefix));
}
