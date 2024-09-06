import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger, Logger } from 'src/libs/logging';
import { fetch } from 'undici';

import { marketChart, simplePrice } from './coingecko.types';

@Injectable()
export class CoingeckoApiService {
  private url: string;
  private apiKey: string;

  constructor(
    private config: ConfigService,
    @Logger('CoingeckoApiService') private logger: CustomLogger,
  ) {
    this.url = this.config.getOrThrow<string>('fiat.coingecko.url');
    this.apiKey = this.config.getOrThrow<string>('fiat.coingecko.apikey');
  }

  async getLatestBtcPrice(): Promise<number | undefined> {
    try {
      const result = await this.fetch(
        `simple/price?ids=bitcoin&vs_currencies=usd`,
      );

      const parsed = simplePrice.parse(result);

      return parsed.bitcoin.usd || undefined;
    } catch (error) {
      this.logger.error('Error getting btc price', { error });
      return undefined;
    }
  }

  async getChartData(days = 7, interval = 'daily') {
    try {
      const result = await this.fetch(
        `coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=${interval}&precision=0`,
      );

      const { prices } = marketChart.parse(result);

      return prices;
    } catch (error) {
      this.logger.error('Error getting btc chart data', { error });
      return undefined;
    }
  }

  private async fetch(endpoint: string): Promise<any> {
    const res = await fetch(`${this.url}/${endpoint}`, {
      headers: { 'x-cg-pro-api-key': this.apiKey },
    });

    return res.json();
  }
}
