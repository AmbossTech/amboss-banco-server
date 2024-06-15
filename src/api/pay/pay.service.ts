import { Injectable } from '@nestjs/common';
import { auto } from 'async';
import { GraphQLError } from 'graphql';
import { LnurlService } from 'src/libs/lnurl/lnurl.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { toWithError } from 'src/utils/async';
import {
  PayLightningAddressAuto,
  PayLiquidAddressInput,
  PayLnAddressPayload,
  ProcessInvoiceAuto,
} from './pay.types';
import Big from 'big.js';
import { wallet_account } from '@prisma/client';
import { BoltzService } from 'src/libs/boltz/boltz.service';
import {
  checkMagicRouteHintInfo,
  decodeBip21Url,
  findMagicRoutingHint,
} from 'src/libs/boltz/boltz.utils';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { BoltzSwapType } from 'src/repo/swaps/swaps.types';
import { ContactService } from 'src/libs/contact/contact.service';
import {
  PaymentOptionChain,
  PaymentOptionCode,
  PaymentOptionNetwork,
} from 'src/libs/lnurl/lnurl.types';
import { getLiquidAssetId } from 'src/utils/crypto/crypto';

@Injectable()
export class PayService {
  constructor(
    private swapRepo: SwapsRepoService,
    private boltzRest: BoltzRestApi,
    private boltzService: BoltzService,
    private lnurlService: LnurlService,
    private liquidService: LiquidService,
    private contactService: ContactService,
    @Logger('PayService') private logger: CustomLogger,
  ) {}

  async payLiquidAddress(
    wallet_account: wallet_account,
    input: PayLiquidAddressInput,
  ) {
    const pset = await this.liquidService.createPset(
      wallet_account.details.descriptor,
      input,
    );

    const base_64 = pset.toString();

    return { base_64 };
  }

  async payLightningInvoice(
    invoice: string,
    wallet_account: wallet_account,
  ): Promise<{ base_64: string }> {
    return await auto<ProcessInvoiceAuto>({
      checkInvoice: async (): Promise<ProcessInvoiceAuto['checkInvoice']> => {
        try {
          return findMagicRoutingHint(invoice);
        } catch (error) {
          throw new Error('Invalid Lightning Invoice');
        }
      },

      getAddressFromRouteHint: [
        'checkInvoice',
        async ({
          checkInvoice,
        }: Pick<ProcessInvoiceAuto, 'checkInvoice'>): Promise<
          ProcessInvoiceAuto['getAddressFromRouteHint']
        > => {
          if (!checkInvoice.magicRoutingHint) return;

          const info = await this.boltzRest.getMagicRouteHintInfo(invoice);

          return checkMagicRouteHintInfo(
            checkInvoice.magicRoutingHint,
            info,
            checkInvoice.decoded,
          );
        },
      ],

      getAddressFromSwap: [
        'getAddressFromRouteHint',
        async ({
          getAddressFromRouteHint,
        }: Pick<ProcessInvoiceAuto, 'getAddressFromRouteHint'>): Promise<
          ProcessInvoiceAuto['getAddressFromSwap']
        > => {
          if (!!getAddressFromRouteHint) return;

          const savedSwap =
            await this.swapRepo.getReverseSwapByInvoice(invoice);

          if (!!savedSwap) {
            if (savedSwap.response.type !== BoltzSwapType.SUBMARINE) {
              throw 'invalid swap type';
            }

            return decodeBip21Url(savedSwap.response.payload.bip21);
          }

          const swap = await this.boltzService.createSubmarineSwap(
            invoice,
            wallet_account.id,
          );

          return decodeBip21Url(swap.bip21);
        },
      ],

      constructTransaction: [
        'getAddressFromRouteHint',
        'getAddressFromSwap',
        async ({
          getAddressFromRouteHint,
          getAddressFromSwap,
        }: Pick<
          ProcessInvoiceAuto,
          'getAddressFromRouteHint' | 'getAddressFromSwap'
        >): Promise<ProcessInvoiceAuto['constructTransaction']> => {
          const info = getAddressFromRouteHint || getAddressFromSwap;

          if (!info) {
            throw 'no address found to pay invoice';
          }

          const amountSats = Math.ceil(info.amount * 10 ** 8);

          const pset = await this.liquidService.createPset(
            wallet_account.details.descriptor,
            {
              fee_rate: 100,
              recipients: [
                {
                  address: info.address,
                  amount: amountSats + '',
                  asset_id: info.asset,
                },
              ],
            },
          );

          const base_64 = pset.toString();

          return { base_64 };
        },
      ],
    }).then((results) => results.constructTransaction);
  }

  async payOnchainLiquidAddress({
    amount,
    address,
    asset_id,
    wallet_account,
  }: {
    amount: number;
    address: string;
    asset_id: string;
    wallet_account: wallet_account;
  }): Promise<{ base_64: string }> {
    this.logger.debug('Creating transaction', {
      amount,
      address,
      asset_id,
      wallet_account,
    });
    // const finalAmount = Math.ceil(amount * 10 ** 8);

    const pset = await this.liquidService.createPset(
      wallet_account.details.descriptor,
      {
        fee_rate: 100,
        recipients: [
          {
            address,
            amount: amount + '',
            asset_id,
          },
        ],
      },
    );

    const base_64 = pset.toString();

    return { base_64 };
  }

  async payLightningAddress({
    money_address,
    amount,
    wallet_account,
    payment_option,
  }: PayLnAddressPayload): Promise<{ base_64: string }> {
    return await auto<PayLightningAddressAuto>({
      getLnAddressInfo: async (): Promise<
        PayLightningAddressAuto['getLnAddressInfo']
      > => {
        const [info, error] = await toWithError(
          this.contactService.getCurrencies(money_address),
        );

        if (error || !info) {
          this.logger.error('Error getting address info', {
            error,
            money_address,
          });

          throw new GraphQLError('Error getting address info');
        }

        return info;
      },

      getPaymentOption: [
        'getLnAddressInfo',
        async ({
          getLnAddressInfo,
        }: Pick<PayLightningAddressAuto, 'getLnAddressInfo'>): Promise<
          PayLightningAddressAuto['getPaymentOption']
        > => {
          if (!payment_option) {
            const defaultOption = getLnAddressInfo.paymentOptions.find(
              (p) =>
                p.code === PaymentOptionCode.LIGHTNING &&
                p.chain === PaymentOptionChain.BTC &&
                p.network === PaymentOptionNetwork.MAINNET,
            );

            if (!defaultOption) {
              throw new Error('Payment option not found for this address');
            }

            return defaultOption;
          }

          const findOption = getLnAddressInfo.paymentOptions.find(
            (p) =>
              p.code === payment_option.code &&
              p.chain === payment_option.chain &&
              p.network === payment_option.network,
          );

          if (!findOption) {
            throw new Error('Payment option not found for this address');
          }

          return findOption;
        },
      ],

      amountCheck: [
        'getPaymentOption',
        async ({
          getPaymentOption,
        }: Pick<PayLightningAddressAuto, 'getPaymentOption'>): Promise<
          PayLightningAddressAuto['amountCheck']
        > => {
          const { min_sendable, max_sendable } = getPaymentOption;

          const minNullOrUndefined = min_sendable == null;
          const maxNullOrUndefined = max_sendable == null;

          const requestedAmount = new Big(amount);

          if (!maxNullOrUndefined && requestedAmount.gt(max_sendable)) {
            throw new GraphQLError(
              `Amount ${amount} is bigger than max of ${max_sendable}`,
            );
          }

          if (!minNullOrUndefined && requestedAmount.lt(min_sendable)) {
            throw new GraphQLError(
              `Amount ${amount} is smaller than min of ${min_sendable}`,
            );
          }
        },
      ],

      pay: [
        'getLnAddressInfo',
        'getPaymentOption',
        'amountCheck',
        async ({
          getLnAddressInfo,
          getPaymentOption,
        }: Pick<
          PayLightningAddressAuto,
          'getLnAddressInfo' | 'getPaymentOption'
        >): Promise<PayLightningAddressAuto['pay']> => {
          const { code, chain, network } = getPaymentOption;

          const uniqueId = `${code}-${chain}-${network}`;

          this.logger.debug('Creating transaction', { uniqueId });

          switch (uniqueId) {
            case `${PaymentOptionCode.LIGHTNING}-${PaymentOptionChain.BTC}-${PaymentOptionNetwork.MAINNET}`: {
              const url = new URL(getLnAddressInfo.info.callback);
              url.searchParams.set('amount', amount * 1000 + '');

              const [addressResult, addressError] = await toWithError(
                this.lnurlService.getAddressInvoice(url.toString()),
              );

              if (addressError || !addressResult.pr) {
                throw new Error('Unable to process Lightning payment');
              }

              const [info, error] = await toWithError(
                this.payLightningInvoice(addressResult.pr, wallet_account),
              );

              if (error) {
                this.logger.error('Error processing payment', {
                  error,
                  invoice_info: addressResult,
                });
                throw new GraphQLError('Error processing payment');
              }

              return info;
            }

            case `${PaymentOptionCode.BTC}-${PaymentOptionChain.LIQUID}-${PaymentOptionNetwork.MAINNET}`:
            case `${PaymentOptionCode.USDT}-${PaymentOptionChain.LIQUID}-${PaymentOptionNetwork.MAINNET}`: {
              const [user] = money_address.split('@');

              const [result, chainError] = await toWithError(
                this.lnurlService.getLnUrlChainResponse({
                  account: user,
                  amount,
                  currency: code,
                  chain,
                  network,
                }),
              );

              if (chainError || !result.onchain?.address) {
                this.logger.error('Error processing payment', {
                  result,
                  chainError,
                });
                throw new Error('Error processing payment');
              }

              const [onchainInfo, onchainError] = await toWithError(
                this.payOnchainLiquidAddress({
                  amount,
                  address: result.onchain.address,
                  asset_id: getLiquidAssetId(code),
                  wallet_account,
                }),
              );

              if (chainError || !onchainInfo) {
                this.logger.error('Error processing payment', {
                  onchainInfo,
                  onchainError,
                });
                throw new Error('Error processing payment');
              }

              return onchainInfo;
            }

            default:
              throw new Error('This payment option is unavailable');
          }
        },
      ],
    }).then((results) => results.pay);
  }
}
