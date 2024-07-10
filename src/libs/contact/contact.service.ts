import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLError } from 'graphql';
import { SendMessageInput } from 'src/api/contact/contact.types';
import { EventsService } from 'src/api/sse/sse.service';
import { EventTypes } from 'src/api/sse/sse.utils';
import { ContactRepoService } from 'src/repo/contact/contact.repo';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';

import { ConfigSchemaType } from '../config/validation';
import { CustomLogger, Logger } from '../logging';

@Injectable()
export class ContactService {
  constructor(
    private config: ConfigService,
    private eventsService: EventsService,
    private walletRepo: WalletRepoService,
    private contactRepo: ContactRepoService,
    @Logger('ContactService') private logger: CustomLogger,
  ) {}

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

    const domains =
      this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
        'server.domains',
      );

    const [user, domain] = receiver_money_address.split('@');

    const senderAddress = `${contact.wallet_on_accounts.money_address_user}@${domains[0]}`;

    if (!!receiver_payload) {
      this.logger.debug('Sending message', { domains, domain });

      if (domains.includes(domain)) {
        const wallet = await this.walletRepo.getWalletByLnAddress(user);

        if (!wallet) {
          throw new GraphQLError('Address not found');
        }

        await this.contactRepo.saveContactMessage({
          money_address_user: user,
          contact_money_address: senderAddress,
          contact_is_sender: true,
          payload_string: receiver_payload,
        });

        this.logger.debug('Sending message event', {
          user_id: wallet.account_id,
        });
        this.eventsService.emit(EventTypes.contacts(wallet.account_id), {
          sender_money_address: senderAddress,
        });
      } else {
        throw new GraphQLError(
          'Sending messages to other Banco instances is not currently available.',
        );

        // try {
        //   await fetch(lightningAddressToMessageUrl(receiver_money_address), {
        //     headers: { 'content-type': 'application/json' },
        //     body: JSON.stringify({
        //       payerData: { identifier: senderAddress },
        //       protected_message: receiver_payload,
        //     }),
        //     method: 'POST',
        //   });
        // } catch (error) {
        //   console.log(error);
        // }
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
