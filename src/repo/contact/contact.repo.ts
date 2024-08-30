import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class ContactRepoService {
  constructor(private prisma: PrismaService) {}

  async upsertContact({
    money_address_user,
    contact_money_address,
  }: {
    money_address_user: string;
    contact_money_address: string;
  }) {
    const walletOnAccount = await this.prisma.wallet_on_accounts.findUnique({
      where: { money_address_user },
      select: { id: true },
    });

    if (!walletOnAccount) {
      throw new GraphQLError('Wallet not found to save contact');
    }

    return this.prisma.contact.upsert({
      where: {
        wallet_on_accounts_id_money_address: {
          wallet_on_accounts_id: walletOnAccount.id,
          money_address: contact_money_address,
        },
      },
      update: {},
      create: {
        wallet_on_accounts_id: walletOnAccount.id,
        money_address: contact_money_address,
      },
    });
  }

  async getContact(
    account_id: string,
    wallet_id: string,
    money_address: string,
  ) {
    return this.prisma.contact.findFirst({
      where: {
        wallet_on_accounts: { account_id, wallet_id },
        money_address,
      },
    });
  }

  async upsertContactForAccount(
    account_id: string,
    wallet_id: string,
    money_address: string,
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
        wallet_on_accounts_id_money_address: {
          wallet_on_accounts_id: walletOnAccount.id,
          money_address,
        },
      },
      update: {},
      create: {
        wallet_on_accounts_id: walletOnAccount.id,
        money_address,
      },
    });
  }

  async getContactsForWallet(wallet_id: string) {
    const res = await this.prisma.wallet_on_accounts.findUnique({
      where: { id: wallet_id },
      include: {
        contacts: {
          include: {
            contact_message: {
              take: 1,
            },
          },
        },
      },
    });

    const contacts = res?.contacts;
    if (!contacts) return [];

    return contacts.sort(
      (a, b) =>
        (b.contact_message.at(0)?.created_at.getTime() || 0) -
        (a.contact_message.at(0)?.created_at.getTime() || 0),
    );
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
    money_address_user,
    contact_money_address,
    payload_string,
    contact_is_sender,
  }: {
    money_address_user: string;
    contact_money_address: string;
    payload_string: string;
    contact_is_sender: boolean;
  }) {
    const contact = await this.upsertContact({
      money_address_user,
      contact_money_address,
    });

    if (!contact) {
      throw new Error('Contact not found for this lightning address');
    }

    const payload = JSON.parse(payload_string);

    return this.prisma.contact_message.create({
      data: {
        payload,
        contact_is_sender,
        contact: { connect: { id: contact.id } },
      },
    });
  }

  async getContactMessages(contact_id: string) {
    return this.prisma.contact_message.findMany({
      where: { contact_id },
      orderBy: { created_at: 'asc' },
    });
  }
}
