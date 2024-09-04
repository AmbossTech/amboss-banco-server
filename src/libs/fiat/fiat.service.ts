import { Injectable } from '@nestjs/common';
import { differenceInDays, isAfter, subMinutes } from 'date-fns';

import { RedisService } from '../redis/redis.service';
import { CoingeckoApiService } from './coingecko/coingecko.service';

@Injectable()
export class FiatService {
  constructor(
    private coingecko: CoingeckoApiService,
    private redis: RedisService,
  ) {}

  async getLatestBtcPrice(): Promise<number | undefined> {
    const key = `FiatService-getLatestBtcPrice`;

    const cached = await this.redis.get<number>(key);
    if (cached) return cached;

    const price = await this.coingecko.getLatestBtcPrice();

    if (!price) return;

    await this.redis.set(key, price, { ttl: 60 });

    return price;
  }

  async getChartPrice(date: Date): Promise<number | undefined> {
    if (isAfter(date, subMinutes(new Date(), 10))) {
      return this.getLatestBtcPrice();
    }

    const ts = date.getTime();
    const key = (ts: number) => `FiatService-getChartData-${ts}`;

    const cached = await this.redis.get<number>(key(ts));
    if (cached) return cached;

    // +1 to add today
    const daysToQuery = differenceInDays(new Date(), date) + 1;

    const chartData = await this.coingecko.getChartData(daysToQuery);
    if (!chartData) return;

    for (const point of chartData) {
      await this.redis.set(key(point[0]), point[1], {
        ttl: 60 * 60 * 24,
      });
    }

    const target = chartData.find((p) => p[0] == ts);
    if (!target) return;

    return target[1];
  }
}
