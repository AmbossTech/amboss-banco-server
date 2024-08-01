import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, Logger, transports } from 'winston';

const { combine, timestamp, prettyPrint, json } = format;

const replaceError = ({ label, level, message, stack }: any) => ({
  label,
  level,
  message,
  stack,
});
const replacer = (key: string, value: any) => {
  return value instanceof Error ? replaceError(value) : value;
};

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  private logger: Logger;
  private prefix: string;

  constructor(private config: ConfigService) {
    this.logger = createLogger({
      format: config.get('isProduction')
        ? combine(timestamp(), json({ replacer }))
        : combine(timestamp(), prettyPrint({ colorize: true })),
      transports: [new transports.Console()],
      level: config.get('logLevel'),
    });
  }

  setPrefix(prefix: string) {
    this.prefix = prefix;
  }

  log(message: string, ...optionalParams: any[]) {
    this.logger.info(this.formatMessage(message), ...optionalParams);
  }

  info(message: string, ...optionalParams: any[]) {
    this.logger.info(this.formatMessage(message), ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    this.logger.error(this.formatMessage(message), ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.logger.warn(this.formatMessage(message), ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    this.logger.debug(this.formatMessage(message), ...optionalParams);
  }

  silly(message: string, ...optionalParams: any[]) {
    this.logger.silly(this.formatMessage(message), ...optionalParams);
  }

  private formatMessage(message: string): string {
    return !!this.prefix ? `[${this.prefix}] ${message}` : message;
  }
}
