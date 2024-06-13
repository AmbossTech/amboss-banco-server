import { Injectable } from '@nestjs/common';
import { LnurlService } from '../lnurl/lnurl.service';
import { SendMessageInput } from 'src/api/contact/contact.types';
import { ContactRepoService } from 'src/repo/contact/contact.repo';
import { GraphQLError } from 'graphql';
import { ConfigService } from '@nestjs/config';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { lightningAddressToMessageUrl } from 'src/utils/lnurl';

@Injectable()
export class ContactService {
  constructor(
    private config: ConfigService,
    private lnurlService: LnurlService,
    private contactRepo: ContactRepoService,
    private walletRepo: WalletRepoService,
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
