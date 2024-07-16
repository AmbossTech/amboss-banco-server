import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auto } from 'async';
import {
  LnUrlCurrenciesAndInfo,
  moneyAddressType,
} from 'src/api/contact/contact.types';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { ConfigSchemaType } from 'src/libs/config/validation';
import { GetCurrenciesAuto } from 'src/libs/contact/contact.types';
import { CustomLogger, Logger } from 'src/libs/logging';
import { RedisService } from 'src/libs/redis/redis.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { toWithError } from 'src/utils/async';
import { getLiquidAssetDecimals } from 'src/utils/crypto/crypto';

import {
  LnUrlInfoSchemaType,
  PaymentOptionCode,
  PaymentOptionNetwork,
} from '../lnurl.types';
import { LnUrlLocalService } from './local.service';
import { LnUrlRemoteService } from './remote.service';

@Injectable()
export class LnUrlIsomorphicService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private boltzRest: BoltzRestApi,
    private walletRepo: WalletRepoService,
    private localLnurl: LnUrlLocalService,
    private remoteLnurl: LnUrlRemoteService,
    @Logger('LnUrlIsomorphicService') private logger: CustomLogger,
  ) {}

  private isLocal(domain: string): boolean {
    const domains =
      this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
        'server.domains',
      );

    return domains.includes(domain);
  }

  private async isomorphic<T>(
    domain: string,
    localFn: () => Promise<T>,
    remoteFn: () => Promise<T>,
  ) {
    if (this.isLocal(domain)) {
      return localFn();
    } else {
      return remoteFn();
    }
  }

  async getChainResponse(
    money_address: string,
    {
      amount,
      network,
      currency,
    }: {
      amount: number;
      network: string;
      currency: string;
    },
  ) {
    const [user, domain] = money_address.split('@');

    const lnUrlData = await this.isomorphic(
      domain,
      async () => {
        return this.localLnurl.getChainResponse({
          account: user,
          amount,
          network,
          currency,
        });
      },
      async () => {
        const [info, error] = await toWithError(this.getInfo(money_address));

        if (error || !info) return null;

        return this.remoteLnurl.getChainResponse({
          callbackUrl: info.callback,
          amount,
          currency,
          network,
        });
      },
    );

    return lnUrlData;
  }

  async getInvoiceResponse(money_address: string, amount: number) {
    const [user, domain] = money_address.split('@');

    const lnUrlData = await this.isomorphic(
      domain,
      async () => {
        return this.localLnurl.getInvoiceResponse(user, amount);
      },
      async () => {
        const [info, error] = await toWithError(this.getInfo(money_address));

        if (error || !info) return null;

        return this.remoteLnurl.getInvoiceResponse({
          callbackUrl: info.callback,
          amount,
        });
      },
    );

    return lnUrlData;
  }

  async getInfo(money_address: string) {
    this.logger.debug('Getting address info', { money_address });

    const key = `LnUrlIsomorphicService-getInfo-${money_address}`;

    const cached = await this.redis.get<LnUrlInfoSchemaType>(key);
    if (!!cached) return cached;

    const [user, domain] = money_address.split('@');

    const lnUrlData = await this.isomorphic(
      domain,
      async () => {
        const wallet = await this.walletRepo.getWalletByLnAddress(user);

        if (!wallet) return null;
        return this.localLnurl.getInfo(user);
      },
      async () => {
        return this.remoteLnurl.getInfo(money_address);
      },
    );

    await this.redis.set(key, lnUrlData, { ttl: 5 * 60 });

    return lnUrlData;
  }

  async getPubkey(money_address: string): Promise<string | null> {
    this.logger.debug('Getting pubkey for lightning address', {
      money_address,
    });

    const key = `LnUrlIsomorphicService-getPubkey-${money_address}`;

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

    const [user, domain] = money_address.split('@');

    const pubkey = await this.isomorphic(
      domain,
      async () => {
        const wallet = await this.walletRepo.getWalletByLnAddress(user);

        if (!wallet) return null;
        return wallet.secp256k1_key_pair.public_key;
      },
      async () => {
        return this.remoteLnurl.getPubkey(money_address);
      },
    );

    await this.redis.set(key, pubkey, { ttl: 24 * 60 * 60 });

    return pubkey;
  }

  async getCurrencies(
    money_address: string,
  ): Promise<LnUrlCurrenciesAndInfo | null> {
    const [lnUrlInfo, error] = await toWithError(this.getInfo(money_address));

    if (error || !lnUrlInfo) return null;

    const currencies = lnUrlInfo.currencies || [];

    const paymentOptions = await auto<GetCurrenciesAuto>({
      getLightningCurrency: async (): Promise<
        GetCurrenciesAuto['getLightningCurrency']
      > => {
        const hasLiquid = currencies.some(
          (c) => c.network === PaymentOptionNetwork.LIQUID,
        );

        if (hasLiquid) return [];

        const { minSendable, maxSendable } = lnUrlInfo;

        if (!minSendable || !maxSendable) return [];

        const [boltzInfo, boltzError] = await toWithError(
          this.boltzRest.getSubmarineSwapInfo(),
        );

        if (boltzError || !boltzInfo['L-BTC'].BTC) {
          this.logger.error('Error fetching Boltz Submarine Swap Info', {
            boltzError,
            boltzInfo,
          });

          return [];
        }

        const {
          fees: { minerFees, percentage },
          limits: { maximal, minimal },
        } = boltzInfo['L-BTC'].BTC;

        const minSats = Math.floor(minSendable / 1000);
        const finalMinSats = Math.max(minimal, minSats);

        const maxSats = Math.ceil(maxSendable / 1000);
        const finalMaxSats = Math.min(maximal, maxSats);

        return [
          {
            name: 'Lightning',
            code: PaymentOptionCode.LIGHTNING,
            network: PaymentOptionNetwork.BITCOIN,
            symbol: '₿',
            min_sendable: finalMinSats,
            max_sendable: finalMaxSats,
            decimals: 0,
            fixed_fee: (minerFees || 0) + 300,
            variable_fee_percentage: percentage,
          },
        ];
      },

      getOtherCurrencies: async (): Promise<
        GetCurrenciesAuto['getOtherCurrencies']
      > => {
        if (!currencies.length) return [];

        const mapped = currencies.map((c) => {
          return {
            name: c.name,
            code: c.code,
            network: c.network,
            symbol: c.symbol,
            min_sendable: null,
            max_sendable: null,
            decimals: getLiquidAssetDecimals(c.code),
            fixed_fee: 300,
            variable_fee_percentage: 0,
          };
        });

        return mapped;
      },
    }).then((result) => {
      return [...result.getLightningCurrency, ...result.getOtherCurrencies];
    });

    return {
      info: lnUrlInfo,
      paymentOptions,
    };
  }
}
