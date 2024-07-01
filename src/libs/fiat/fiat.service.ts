import { Injectable } from '@nestjs/common';

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

    await this.redis.set(key, price, { ttl: 10 * 60 });

    return price;
  }
}
