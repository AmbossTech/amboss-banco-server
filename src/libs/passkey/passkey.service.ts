import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import { CustomLogger, Logger } from '../logging';
import { AAGUID_JSON_URL } from './passkey.utils';

@Injectable()
export class PasskeyService implements OnModuleInit {
  private aaguidJson: { [key: string]: { name: string } } = {};

  constructor(
    private config: ConfigService,
    @Logger(PasskeyService.name) private logger: CustomLogger,
  ) {}

  async onModuleInit() {
    const isProduction = this.config.get<boolean>('isProduction');
    if (!isProduction) return;

    try {
      this.aaguidJson = await fetch(AAGUID_JSON_URL).then(
        (res) => res.json() as any,
      );
    } catch (error) {
      this.logger.error('Error fetching AAGUID JSON array');
    }
  }

  async getPasskeyInfo(aaguid: string | undefined) {
    return this.aaguidJson[aaguid || ''] || { name: 'Passkey' };
  }
}
