import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger, Logger } from 'src/libs/logging';
import { fetch } from 'undici';

import { simplePrice } from './coingecko.types';

@Injectable()
export class CoingeckoApiService {
  constructor(
    private config: ConfigService,
    @Logger('CoingeckoApiService') private logger: CustomLogger,
  ) {}

  async getLatestBtcPrice(): Promise<number | undefined> {
    try {
      const url = this.config.getOrThrow<string>('fiat.coingecko.url');
      const apiKey = this.config.getOrThrow<string>('fiat.coingecko.apikey');

      const response = await fetch(
        `${url}simple/price?ids=bitcoin&vs_currencies=usd`,
        {
          headers: { 'x-cg-pro-api-key': apiKey },
        },
      );

      const result = await response.json();

      const parsed = simplePrice.parse(result);

      return parsed.bitcoin.usd || undefined;
    } catch (error) {
      this.logger.error('Error getting btc price', { error });
      return undefined;
    }
  }
}
