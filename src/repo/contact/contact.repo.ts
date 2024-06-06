import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class ContactRepoService {
  constructor(private prisma: PrismaService) {}

  async upsertContact({
    lightning_address_user,
    contact_lightning_address,
  }: {
    lightning_address_user: string;
    contact_lightning_address: string;
  }) {
    const walletOnAccount = await this.prisma.wallet_on_accounts.findUnique({
      where: { lightning_address_user },
      select: { id: true },
    });

    if (!walletOnAccount) {
      throw new GraphQLError('Wallet not found to save contact');
    }

    return this.prisma.contact.upsert({
      where: {
        wallet_on_accounts_id_lightning_address: {
          wallet_on_accounts_id: walletOnAccount.id,
          lightning_address: contact_lightning_address,
        },
      },
      update: {},
      create: {
        wallet_on_accounts_id: walletOnAccount.id,
        lightning_address: contact_lightning_address,
      },
    });
  }

  async upsertContactForAccount(
    account_id: string,
    wallet_id: string,
    lightning_address: string,
  ) {
    const walletOnAccount = await this.prisma.wallet_on_accounts.findUnique({
      where: { account_id_wallet_id: { account_id, wallet_id } },
      select: { id: true },
    });

    if (!walletOnAccount) {
      throw new GraphQLError('Wallet not found to save contact');
    }

    return this.prisma.contact.upsert({
      where: {
        wallet_on_accounts_id_lightning_address: {
          wallet_on_accounts_id: walletOnAccount.id,
          lightning_address,
        },
      },
      update: {},
      create: {
        wallet_on_accounts_id: walletOnAccount.id,
        lightning_address,
      },
    });
  }

  async getContactsForWallet(wallet_id: string) {
    return this.prisma.wallet_on_accounts.findUnique({
      where: { id: wallet_id },
      include: { contacts: true },
    });
  }

  async getWalletContact(contact_id: string, wallet_id: string) {
    return this.prisma.contact.findUnique({
      where: { id: contact_id, wallet_on_accounts_id: wallet_id },
      include: { wallet_on_accounts: true },
    });
  }

  async getContactForAccount(contact_id: string, account_id: string) {
    return this.prisma.contact.findUnique({
      where: { id: contact_id, wallet_on_accounts: { account_id } },
      include: { wallet_on_accounts: true },
    });
  }

  async saveContactMessage({
    lightning_address_user,
    contact_lightning_address,
    protected_message,
    contact_is_sender,
  }: {
    lightning_address_user: string;
    contact_lightning_address: string;
    protected_message: string;
    contact_is_sender: boolean;
  }) {
    const contact = await this.upsertContact({
      lightning_address_user,
      contact_lightning_address,
    });

    if (!contact) {
      throw new Error('Contact not found for this lightning address');
    }

    return this.prisma.contact_message.create({
      data: {
        protected_message,
        contact_is_sender,
        contact: { connect: { id: contact.id } },
      },
    });
  }

  async getContactMessages(contact_id: string) {
    return this.prisma.contact_message.findMany({ where: { contact_id } });
  }
}
