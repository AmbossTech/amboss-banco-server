import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { moneyAddressType } from 'src/api/contact/contact.types';
import { RedisService } from '../redis/redis.service';
import {
  lightningAddressToPubkeyUrl,
  lightningAddressToUrl,
} from 'src/utils/lnurl';
import {
  AccountCurrency,
  CallbackHandlerParams,
  CallbackParams,
  GetLnUrlResponseAutoType,
  GetLnurlAutoType,
  LightningAddressPubkeyResponseSchema,
} from 'src/api/lnurl/lnurl.types';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { CustomLogger, Logger } from '../logging';
import { fetch } from 'undici';
import {
  LnUrlInfoSchema,
  LnUrlInfoSchemaType,
  LnUrlResultSchema,
  LnUrlResultSchemaType,
  PaymentOptionCode,
  PaymentOptionNetwork,
} from './lnurl.types';
import {
  LiquidWalletAssets,
  WalletAccountType,
} from 'src/repo/wallet/wallet.types';
import { liquidAssetIds } from 'src/utils/crypto/crypto';
import { auto } from 'async';
import { BoltzRestApi } from '../boltz/boltz.rest';
import { LiquidService } from '../liquid/liquid.service';

@Injectable()
export class LnurlService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private boltzApi: BoltzRestApi,
    private liquidService: LiquidService,
    private walletRepo: WalletRepoService,
    @Logger('LnurlService') private logger: CustomLogger,
  ) {}

  async getLnUrlInfo(account: string) {
    return auto<GetLnurlAutoType>({
      // getBoltzInfo: async () => {
      //   return this.boltzApi.getReverseSwapInfo();
      // },

      getAccountCurrencies: async () => {
        const currencies = await this.getLnUrlCurrencies(account);
        return currencies.map((c) => {
          const { code, name, network, symbol } = c;
          return {
            code,
            name,
            network,
            symbol,
          };
        });
      },

      buildResponse: [
        'getAccountCurrencies',
        async ({
          getAccountCurrencies,
        }: Pick<GetLnurlAutoType, 'getAccountCurrencies'>) => {
          return {
            callback: `http://${this.config.getOrThrow('server.domain')}/lnurlp/${account}`,
            minSendable: 0,
            maxSendable: 0,
            // minSendable: getBoltzInfo.BTC['L-BTC'].limits.minimal,
            // maxSendable: getBoltzInfo.BTC['L-BTC'].limits.maximal,
            metadata: JSON.stringify([
              ['text/plain', `Payment to ${account}`],
              [
                'text/identifier',
                `${account}@${this.config.getOrThrow('server.domain')}`,
              ],
            ]),
            // payerData: {
            //   // name: { mandatory: false },
            //   // pubkey: { mandatory: false },
            //   identifier: { mandatory: false },
            // },
            currencies: getAccountCurrencies,
            tag: 'payRequest',
          };
        },
      ],
    }).then((result) => result.buildResponse);
  }

  async getLnUrlCurrencies(account: string): Promise<AccountCurrency[]> {
    const wallet = await this.walletRepo.getWalletByLnAddress(account);

    if (!wallet?.wallet.wallet_account.length) {
      return [];
    }

    const hasLiquidAccount = wallet.wallet.wallet_account.find(
      (a) => a.details.type === WalletAccountType.LIQUID,
    );

    if (!hasLiquidAccount) return [];

    const currencies: AccountCurrency[] = [];

    currencies.push({
      code: PaymentOptionCode.BTC,
      name: LiquidWalletAssets.BTC.name,
      network: PaymentOptionNetwork.LIQUID,
      symbol: LiquidWalletAssets.BTC.symbol,
      wallet_account: hasLiquidAccount,
      asset_id: liquidAssetIds.mainnet.bitcoin,
      conversion_decimals: 8,
      // multiplier: 1000,
      // decimals: 8,
      // convertible: {
      //   min: 1,
      //   max: 100000000,
      // },
    });

    currencies.push({
      code: PaymentOptionCode.USDT,
      name: LiquidWalletAssets.USDT.name,
      network: PaymentOptionNetwork.LIQUID,
      symbol: LiquidWalletAssets.USDT.symbol,
      wallet_account: hasLiquidAccount,
      asset_id: liquidAssetIds.mainnet.tether,
      conversion_decimals: 0,
      // multiplier: 1000,
      // decimals: 8,
      // convertible: {
      //   min: 1,
      //   max: 100000000,
      // },
    });

    return currencies;
  }

  async getLnUrlChainResponse(
    props: CallbackHandlerParams,
  ): Promise<LnUrlResultSchemaType> {
    const { account, amount } = props;

    return auto<GetLnUrlResponseAutoType>({
      checkCurrency: async () => {
        const currencies = await this.getLnUrlCurrencies(account);

        if (!props.network) {
          throw new Error(
            JSON.stringify({
              status: 'ERROR',
              reason: 'A network needs to be provided',
            }),
          );
        }

        if (!currencies.length) {
          throw new Error(
            JSON.stringify({
              status: 'ERROR',
              reason: 'No currencies are available',
            }),
          );
        }

        const foundCurrency = currencies.find((c) => {
          return c.code === props.currency && c.network === props.network;
        });

        if (!foundCurrency) {
          throw new Error(
            JSON.stringify({
              status: 'ERROR',
              reason: `Currency ${props.currency} on network ${props.network} is not available`,
            }),
          );
        }

        return foundCurrency;
      },

      createPayload: [
        'checkCurrency',
        async ({ checkCurrency }) => {
          const addressObject = await this.liquidService.getOnchainAddress(
            checkCurrency.wallet_account.details.descriptor,
            true,
          );

          const address = addressObject.address().toString();

          const bip21 = [
            'liquidnetwork:',
            address,
            `?amount=${amount / 10 ** checkCurrency.conversion_decimals}`,
            `&assetid=${checkCurrency.asset_id}`,
          ].join('');

          return {
            pr: '',
            routes: [],
            onchain: {
              currency: props.currency,
              network: props.network,
              address,
              bip21,
            },
          };
        },
      ],
    })
      .then((result) => {
        return result.createPayload;
      })
      .catch((err) => {
        return err.message;
      });
  }

  async getLnUrlInvoiceResponse() {
    // TODO: Handle creating a Boltz swap to get a lightning invoice

    //   checkAmount: [
    //     'checkCurrency',
    //     async ({
    //       checkCurrency,
    //     }: Pick<GetLnUrlResponseAutoType, 'checkCurrency'>) => {
    //       if (!!checkCurrency) return;

    //       const boltzInfo = await this.boltzApi.getReverseSwapInfo();

    //       const { maximal, minimal } = boltzInfo.BTC['L-BTC'].limits;

    //       if (maximal < amount) {
    //         throw new Error(
    //           JSON.stringify({
    //             status: 'ERROR',
    //             reason: `Amount ${amount} greater than maximum of ${maximal}`,
    //           }),
    //         );
    //       }

    //       if (minimal > amount) {
    //         throw new Error(
    //           JSON.stringify({
    //             status: 'ERROR',
    //             reason: `Amount ${amount} smaller than minimum of ${minimal}`,
    //           }),
    //         );
    //       }
    //     },
    //   ],

    return {
      status: 'ERROR',
      reason: 'Lightning Address is currently unavailable',
    };
  }

  async getLnUrlResponse(props: CallbackParams): Promise<string> {
    if (!props.account) {
      throw new Error(
        JSON.stringify({
          status: 'ERROR',
          reason: 'No account provided',
        }),
      );
    }

    const account = props.account.toLowerCase();

    if (!props.amount) {
      throw new Error(
        JSON.stringify({
          status: 'ERROR',
          reason: 'No amount provided',
        }),
      );
    }

    const amount = Number(props.amount);

    if (isNaN(amount)) {
      throw new Error(
        JSON.stringify({
          status: 'ERROR',
          reason: 'No amount provided',
        }),
      );
    }

    if (!!props.currency) {
      const response = await this.getLnUrlChainResponse({
        ...props,
        account,
        amount,
        currency: props.currency,
      });

      return JSON.stringify(response);
    }

    const response = await this.getLnUrlInvoiceResponse();

    return JSON.stringify(response);
  }

  async getAddressInfo(money_address: string) {
    this.logger.debug('Getting address info', { money_address });

    const key = `getAddressInfo-address-${money_address}`;

    const cached = await this.redis.get<LnUrlInfoSchemaType>(key);
    if (!!cached) return cached;

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = money_address.split('@');

    let lnUrlData;

    if (serverDomain === domain) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) return null;

      lnUrlData = await this.getLnUrlInfo(user);
    } else {
      const url = lightningAddressToUrl(money_address);

      const fetchInfo = await fetch(url);

      lnUrlData = await fetchInfo.json();
    }

    const parsed = LnUrlInfoSchema.parse(lnUrlData);

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
