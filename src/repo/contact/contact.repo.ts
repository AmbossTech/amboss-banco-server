import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class ContactRepoService {
  constructor(private prisma: PrismaService) {}

  async createContact(
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
}
