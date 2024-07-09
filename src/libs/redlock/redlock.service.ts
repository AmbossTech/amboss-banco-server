import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Client from 'ioredis';
import Redlock, {
  ExecutionError,
  RedlockAbortSignal,
  ResourceLockedError,
} from 'redlock';

import { CustomLogger, Logger } from '../logging';

@Injectable()
export class RedlockService {
  private client: Client;
  private redlock: Redlock;

  constructor(
    private configService: ConfigService,
    @Logger(RedlockService.name) private logger: CustomLogger,
  ) {
    this.client = new Client({
      host: configService.get('redis.host'),
      port: configService.get('redis.port'),
    });

    this.redlock = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 0,
      automaticExtensionThreshold: 500, // time in ms
    });

    this.redlock.on('error', (error) => {
      if (error instanceof ResourceLockedError) {
        this.logger.silly('Resource is locked', { error });
        return;
      }
      this.logger.error('Redlock Error', { error });
    });
  }

  async using<T>(key: string, methodToCall: () => Promise<T>) {
    const finalKey = `redlockService-${key}`;
    await this.redlock
      .using([finalKey], 10000, async (signal: RedlockAbortSignal) => {
        await methodToCall();

        if (signal.aborted) {
          throw signal.error;
        }
      })
      .catch((error) => {
        if (error instanceof ExecutionError) {
          // Fix for this bug https://github.com/mike-marcacci/node-redlock/issues/168
          // This error is incorrectly thrown when it should be a "ResourceLockedError"
          if (
            error.message ===
            'The operation was unable to achieve a quorum during its retry window.'
          )
            return;
        }

        this.logger.error('Redlock Error', { error });
      });
  }
}
