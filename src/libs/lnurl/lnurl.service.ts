import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auto } from 'async';
import { moneyAddressType } from 'src/api/contact/contact.types';
import {
  AccountCurrency,
  CallbackHandlerParams,
  CallbackParams,
  GetLnurlAutoType,
  GetLnUrlInvoiceAutoType,
  GetLnUrlResponseAutoType,
  LightningAddressPubkeyResponseSchema,
} from 'src/api/lnurl/lnurl.types';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import {
  LiquidWalletAssets,
  WalletAccountType,
} from 'src/repo/wallet/wallet.types';
import { liquidAssetIds } from 'src/utils/crypto/crypto';
import {
  lightningAddressToPubkeyUrl,
  lightningAddressToUrl,
} from 'src/utils/lnurl';
import { fetch } from 'undici';

import { BoltzService } from '../boltz/boltz.service';
import { ConfigSchemaType } from '../config/validation';
import { CryptoService } from '../crypto/crypto.service';
import { LiquidService } from '../liquid/liquid.service';
import { CustomLogger, Logger } from '../logging';
import { RedisService } from '../redis/redis.service';
import {
  LnUrlInfoSchema,
  LnUrlInfoSchemaType,
  LnUrlResponseSchemaType,
  LnUrlResultSchema,
  PaymentOptionCode,
  PaymentOptionNetwork,
} from './lnurl.types';

@Injectable()
export class LnurlService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private boltzService: BoltzService,
    private liquidService: LiquidService,
    private walletRepo: WalletRepoService,
    private cryptoService: CryptoService,
    @Logger('LnurlService') private logger: CustomLogger,
  ) {}

  async getLnUrlInfo(account: string) {
    return auto<GetLnurlAutoType>({
      getBoltzInfo: async () => {
        return this.boltzService.getReverseSwapInfo();
      },

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
        'getBoltzInfo',
        async ({
          getAccountCurrencies,
          getBoltzInfo,
        }: Pick<GetLnurlAutoType, 'getAccountCurrencies' | 'getBoltzInfo'>) => {
          const domains =
            this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
              'server.domains',
            );

          return {
            callback: `http://${domains[0]}/lnurlp/${account}`,
            minSendable: getBoltzInfo.BTC['L-BTC'].limits.minimal,
            maxSendable: getBoltzInfo.BTC['L-BTC'].limits.maximal,
            metadata: JSON.stringify([
              ['text/plain', `Payment to ${account}`],
              ['text/identifier', `${account}@${domains[0]}`],
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
  ): Promise<LnUrlResponseSchemaType> {
    const { account, amount } = props;

    return auto<GetLnUrlResponseAutoType>({
      checkCurrency: async () => {
        const currencies = await this.getLnUrlCurrencies(account);

        if (!props.network) {
          throw new Error('A network needs to be provided');
        }

        if (!currencies.length) {
          throw new Error('No currencies are available');
        }

        const foundCurrency = currencies.find((c) => {
          return c.code === props.currency && c.network === props.network;
        });

        if (!foundCurrency) {
          throw new Error(
            `Currency ${props.currency} on network ${props.network} is not available`,
          );
        }

        return foundCurrency;
      },

      createPayload: [
        'checkCurrency',
        async ({ checkCurrency }): Promise<LnUrlResponseSchemaType> => {
          const descriptor = this.cryptoService.decryptString(
            checkCurrency.wallet_account.details.local_protected_descriptor,
          );

          const addressObject = await this.liquidService.getOnchainAddress(
            descriptor,
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
      .catch((error) => {
        this.logger.error('Error getting lnurl onchain response', { error });
        return {
          status: 'ERROR',
          reason: error.message,
        };
      });
  }

  async getLnUrlInvoiceResponse(
    account: string,
    amount: number,
  ): Promise<LnUrlResponseSchemaType> {
    return auto<GetLnUrlInvoiceAutoType>({
      checkAmount: async () => {
        const boltzInfo = await this.boltzService.getReverseSwapInfo();

        const { maximal, minimal } = boltzInfo.BTC['L-BTC'].limits;

        if (maximal < amount) {
          throw new Error(
            `Amount ${amount} greater than maximum of ${maximal}`,
          );
        }

        if (minimal > amount) {
          throw new Error(
            `Amount ${amount} smaller than minimum of ${minimal}`,
          );
        }

        return amount;
      },

      createSwap: [
        'checkAmount',
        async ({ checkAmount }) => {
          const accountWallets =
            await this.walletRepo.getWalletByLnAddress(account);

          const liquidWalletAccounts =
            accountWallets?.wallet.wallet_account.filter(
              (w) => w.details.type === WalletAccountType.LIQUID,
            );

          if (!liquidWalletAccounts?.length) {
            throw new Error(`No wallet available`);
          }

          const walletAcc = liquidWalletAccounts[0];

          const descriptor = this.cryptoService.decryptString(
            walletAcc.details.local_protected_descriptor,
          );

          const address =
            await this.liquidService.getOnchainAddress(descriptor);

          return this.boltzService.createReverseSwap(
            address.address().toString(),
            checkAmount,
            walletAcc.id,
          );
        },
      ],

      createPayload: [
        'createSwap',
        async ({
          createSwap,
        }: Pick<GetLnUrlInvoiceAutoType, 'createSwap'>): Promise<
          GetLnUrlInvoiceAutoType['createPayload']
        > => {
          return {
            pr: createSwap.invoice,
            routes: [],
          };
        },
      ],
    })
      .then((result) => result.createPayload)
      .catch((error) => {
        this.logger.error('Error getting lnurl invoice response', { error });
        return {
          status: 'ERROR',
          reason: error.message,
        };
      });
  }

  async getLnUrlResponse(props: CallbackParams): Promise<string> {
    if (!props.account) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'No account provided',
      });
    }

    const account = props.account.toLowerCase();

    if (!props.amount) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'No amount provided',
      });
    }

    const amount = Number(props.amount);

    if (isNaN(amount)) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'No amount provided',
      });
    }

    if (!!props.currency) {
      if (!props.network) {
        throw new Error(
          JSON.stringify({
            status: 'ERROR',
            reason: 'A network needs to be provided',
          }),
        );
      }

      const response = await this.getLnUrlChainResponse({
        account,
        amount,
        network: props.network,
        currency: props.currency,
      });

      return JSON.stringify(response);
    }

    const response = await this.getLnUrlInvoiceResponse(account, amount);

    return JSON.stringify(response);
  }

  async getAddressInfo(money_address: string) {
    this.logger.debug('Getting address info', { money_address });

    const key = `getAddressInfo-address-${money_address}`;

    const cached = await this.redis.get<LnUrlInfoSchemaType>(key);
    if (!!cached) return cached;

    const domains =
      this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
        'server.domains',
      );

    const [user, domain] = money_address.split('@');

    let lnUrlData;

    if (domains.includes(domain)) {
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

    const domains =
      this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
        'server.domains',
      );

    const [user, domain] = money_address.split('@');

    if (domains.includes(domain)) {
      const wallet = await this.walletRepo.getWalletByLnAddress(user);

      if (!wallet) return null;

      const { public_key } = wallet.secp256k1_key_pair;

      await this.redis.set(key, public_key, { ttl: 24 * 60 * 60 });

      return public_key;
    } else {
      try {
        const rawInfo = await fetch(lightningAddressToPubkeyUrl(money_address));

        const info = await rawInfo.json();

        const parsed =
          LightningAddressPubkeyResponseSchema.passthrough().safeParse(info);

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
