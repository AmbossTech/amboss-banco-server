import { Injectable } from '@nestjs/common';
import { auto } from 'async';
import { GraphQLError } from 'graphql';
import { LnurlService } from 'src/libs/lnurl/lnurl.service';
import { CustomLogger, Logger } from 'src/libs/logging';
import { toWithError } from 'src/utils/async';
import {
  PayLightningAddressAuto,
  PayLiquidAddressInput,
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

@Injectable()
export class PayService {
  constructor(
    private swapRepo: SwapsRepoService,
    private boltzRest: BoltzRestApi,
    private boltzService: BoltzService,
    private lnurlService: LnurlService,
    private liquidService: LiquidService,
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

  async payLightningAddress(
    money_address: string,
    amount: number,
    wallet_account: wallet_account,
  ): Promise<{ base_64: string }> {
    return await auto<PayLightningAddressAuto>({
      getLnAddressInfo: async (): Promise<
        PayLightningAddressAuto['getLnAddressInfo']
      > => {
        const [info, error] = await toWithError(
          this.lnurlService.getAddressInfo(money_address),
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

      amountCheck: [
        'getLnAddressInfo',
        async ({
          getLnAddressInfo,
        }: Pick<PayLightningAddressAuto, 'getLnAddressInfo'>): Promise<
          PayLightningAddressAuto['amountCheck']
        > => {
          const { maxSendable, minSendable } = getLnAddressInfo;

          const requestedAmount = new Big(amount);

          if (requestedAmount.gt(maxSendable)) {
            throw new GraphQLError(
              `Amount ${amount} is bigger than max of ${maxSendable}`,
            );
          }

          if (requestedAmount.lt(minSendable)) {
            throw new GraphQLError(
              `Amount ${amount} is smaller than min of ${minSendable}`,
            );
          }
        },
      ],

      getInvoice: [
        'getLnAddressInfo',
        'amountCheck',
        async ({
          getLnAddressInfo,
        }: Pick<PayLightningAddressAuto, 'getLnAddressInfo'>): Promise<
          PayLightningAddressAuto['getInvoice']
        > => {
          const url = new URL(getLnAddressInfo.callback);
          url.searchParams.set('amount', amount * 1000 + '');

          const addressResult = await this.lnurlService.getAddressInvoice(
            url.toString(),
          );

          return addressResult.pr;
        },
      ],

      processInvoice: [
        'getInvoice',
        async ({
          getInvoice,
        }: Pick<PayLightningAddressAuto, 'getInvoice'>): Promise<
          PayLightningAddressAuto['processInvoice']
        > => {
          const [info, error] = await toWithError(
            this.payLightningInvoice(getInvoice, wallet_account),
          );

          if (error) {
            this.logger.error('Error processing invoice', {
              error,
              invoice_info: getInvoice,
            });
            throw new GraphQLError('Error processing invoice');
          }

          return info;
        },
      ],
    }).then((results) => results.processInvoice);
  }
}
