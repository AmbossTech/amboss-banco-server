import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { moneyAddressType } from 'src/api/contact/contact.types';
import { RedisService } from '../redis/redis.service';
import {
  lightningAddressToPubkeyUrl,
  lightningAddressToUrl,
} from 'src/utils/lnurl';
import { LightningAddressPubkeyResponseSchema } from 'src/api/lnurl/lnurl.types';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { CustomLogger, Logger } from '../logging';
import { fetch } from 'undici';
import {
  LnUrlInfoSchema,
  LnUrlInfoSchemaType,
  LnUrlResultSchema,
} from './lnurl.types';

@Injectable()
export class LnurlService {
  constructor(
    private config: ConfigService,
    private redis: RedisService,
    private walletRepo: WalletRepoService,
    @Logger('LnurlService') private logger: CustomLogger,
  ) {}

  async getAddressInfo(money_address: string) {
    this.logger.debug('Getting address info', { money_address });

    const key = `getAddressInfo-address-${money_address}`;

    const cached = await this.redis.get<LnUrlInfoSchemaType>(key);
    if (!!cached) return cached;

    const url = lightningAddressToUrl(money_address);

    const info = await fetch(url);

    const data = await info.json();

    const parsed = LnUrlInfoSchema.parse(data);

    await this.redis.set(key, parsed, { ttl: 5 * 60 });

    return parsed;
  }

  async getAddressInvoice(url: string) {
    this.logger.debug('Getting address invoice', { url });

    const info = await fetch(url);
    const data = await info.json();

    return LnUrlResultSchema.parse(data);
  }

  async getAddressPublicKey(money_address: string): Promise<string | null> {
    this.logger.debug('Getting pubkey for lightning address', {
      money_address,
    });

    const key = `getAddressPubkey-pubkey-${money_address}`;

    const cached = await this.redis.get<string>(key);
    if (!!cached) return cached;

    const isProd = this.config.getOrThrow('isProduction');

    if (isProd) {
      const result = moneyAddressType.safeParse(money_address);

      if (!result.success) {
        this.logger.error('Invalid lightning address for parsing', { result });
        return null;
      }
    }

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = money_address.split('@');

    if (serverDomain === domain) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) return null;

      const { public_key } = wallet.secp256k1_key_pair;

      await this.redis.set(key, public_key, { ttl: 24 * 60 * 60 });

      return public_key;
    } else {
      try {
        const rawInfo = await fetch(lightningAddressToPubkeyUrl(money_address));

        const info = await rawInfo.json();

        const parsed = LightningAddressPubkeyResponseSchema.safeParse(info);

        if (!parsed.success) return null;

        await this.redis.set(key, parsed.data.encryptionPubKey, {
          ttl: 24 * 60 * 60,
        });

        return parsed.data.encryptionPubKey;
      } catch (error) {
        return null;
      }
    }
  }
}
