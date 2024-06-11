import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lightningAddressType } from 'src/api/contact/contact.types';
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

  async getAddressInfo(lightning_address: string) {
    this.logger.debug('Getting address info', { lightning_address });

    const key = `getAddressInfo-address-${lightning_address}`;

    const cached = await this.redis.get<LnUrlInfoSchemaType>(key);
    if (!!cached) return cached;

    const url = lightningAddressToUrl(lightning_address);

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

  async getAddressPublicKey(lightning_address: string): Promise<string | null> {
    this.logger.debug('Getting pubkey for lightning address', {
      lightning_address,
    });

    const key = `getAddressPubkey-pubkey-${lightning_address}`;

    const cached = await this.redis.get<string>(key);
    if (!!cached) return cached;

    const isProd = this.config.getOrThrow('isProduction');

    if (isProd) {
      const result = lightningAddressType.safeParse(lightning_address);

      if (!result.success) {
        this.logger.error('Invalid lightning address for parsing', { result });
        return null;
      }
    }

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = lightning_address.split('@');

    if (serverDomain === domain) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) return null;

      const { public_key } = wallet.secp256k1_key_pair;

      await this.redis.set(key, public_key, { ttl: 24 * 60 * 60 });

      return public_key;
    } else {
      try {
        const rawInfo = await fetch(
          lightningAddressToPubkeyUrl(lightning_address),
        );

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
