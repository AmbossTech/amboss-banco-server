import { Injectable } from '@nestjs/common';
import {
  LnUrlCurrencyType,
  SendMessageInput,
} from 'src/api/contact/contact.types';
import { ContactRepoService } from 'src/repo/contact/contact.repo';
import { GraphQLError } from 'graphql';
import { ConfigService } from '@nestjs/config';
import { lightningAddressToMessageUrl } from 'src/utils/lnurl';
import { toWithError } from 'src/utils/async';
import { LnurlService } from '../lnurl/lnurl.service';
import { BoltzRestApi } from '../boltz/boltz.rest';
import { CustomLogger, Logger } from '../logging';
import { auto } from 'async';
import { GetCurrenciesAuto } from './contact.types';

@Injectable()
export class ContactService {
  constructor(
    private config: ConfigService,
    private boltzRest: BoltzRestApi,
    private lnurlService: LnurlService,
    private contactRepo: ContactRepoService,
    @Logger('ContactService') private logger: CustomLogger,
  ) {}

  async getCurrencies(money_address: string): Promise<LnUrlCurrencyType[]> {
    const [lnUrlInfo, error] = await toWithError(
      this.lnurlService.getAddressInfo(money_address),
    );

    if (error || !lnUrlInfo) return [];

    return auto<GetCurrenciesAuto>({
      getLightningCurrency: async (): Promise<
        GetCurrenciesAuto['getLightningCurrency']
      > => {
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
            code: 'lightning',
            network: 'mainnet',
            symbol: '₿',
            min_sendable: finalMinSats,
            max_sendable: finalMaxSats,
            fixed_fee: (minerFees || 0) + 300,
            variable_fee_percentage: percentage,
          },
        ];
      },
      getOtherCurrencies: async (): Promise<
        GetCurrenciesAuto['getOtherCurrencies']
      > => {
        const currencies = lnUrlInfo.currencies || [];

        if (!currencies.length) return [];

        const mapped = currencies.map((c) => {
          return {
            name: c.name,
            code: c.code,
            network: c.network,
            symbol: c.symbol,
            min_sendable: null,
            max_sendable: null,
            fixed_fee: 300,
            variable_fee_percentage: 0,
          };
        });

        return mapped;
      },
    }).then((result) => {
      return [...result.getLightningCurrency, ...result.getOtherCurrencies];
    });
  }

  async sendMessage({
    account_id,
    contact_id,
    receiver_money_address,
    receiver_payload,
    sender_payload,
  }: SendMessageInput & { account_id: string }) {
    const contact = await this.contactRepo.getContactForAccount(
      contact_id,
      account_id,
    );

    if (!contact?.wallet_on_accounts?.money_address_user) {
      throw new GraphQLError('Contact not found');
    }

    const serverDomain = this.config.getOrThrow('server.domain');

    const [user, domain] = receiver_money_address.split('@');

    const senderAddress = `${contact.wallet_on_accounts.money_address_user}@${serverDomain}`;

    if (serverDomain === domain) {
      // const wallet = await this.walletRepo.getWalletByLnAddress(user);

      await this.contactRepo.saveContactMessage({
        money_address_user: user,
        contact_money_address: senderAddress,
        contact_is_sender: true,
        payload_string: receiver_payload,
      });
    } else {
      try {
        await fetch(lightningAddressToMessageUrl(receiver_money_address), {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            payerData: { identifier: senderAddress },
            protected_message: receiver_payload,
          }),
          method: 'POST',
        });
      } catch (error) {
        console.log(error);
      }
    }

    await this.contactRepo.saveContactMessage({
      money_address_user: contact.wallet_on_accounts.money_address_user,
      contact_money_address: receiver_money_address,
      contact_is_sender: false,
      payload_string: sender_payload,
    });
  }
}
