import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: { ttl: number }) {
    const finalTTL = options?.ttl ? options.ttl * 1000 : undefined;
    await this.cache.set(key, value, finalTTL);
  }

  async delete(key: string) {
    await this.cache.del(key);
  }
}
