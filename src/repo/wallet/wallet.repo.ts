import { Injectable } from '@nestjs/common';
import {
  GetAccountWalletsResult,
  WalletAccountDetailsType,
} from 'src/api/wallet/wallet.types';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class WalletRepoService {
  constructor(private prisma: PrismaService) {}

  async countAccountWallets(account_id: string) {
    return this.prisma.wallet_on_accounts.count({ where: { account_id } });
  }

  async getAccountWallets(
    account_id: string,
  ): Promise<GetAccountWalletsResult[]> {
    return this.prisma.wallet_on_accounts.findMany({
      where: { account_id },
      include: { wallet: { include: { wallet_account: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAccountWallet(
    account_id: string,
    wallet_id: string,
  ): Promise<GetAccountWalletsResult | null> {
    return this.prisma.wallet_on_accounts.findUnique({
      where: { account_id_wallet_id: { wallet_id, account_id } },
      include: { wallet: { include: { wallet_account: true } } },
    });
  }

  // async getAccountWalletAccount(id: string, account_id: string) {
  //   return this.prisma.wallet.findUnique({
  //     where: { id, wallet_account: {} },
  //   });
  // }

  async createNewWallet({
    account_id,
    is_owner,
    name,
    vault,
  }: {
    account_id: string;
    is_owner: boolean;
    name: string;
    vault: string | undefined;
  }) {
    return this.prisma.wallet.create({
      data: {
        name,
        accounts: {
          create: {
            is_owner,
            vault,
            account: { connect: { id: account_id } },
          },
        },
      },
    });
  }

  async createNewAccount(
    name: string,
    wallet_id: string,
    details: WalletAccountDetailsType,
  ) {
    return this.prisma.wallet_account.create({
      data: { wallet_id, details, name },
    });
  }
}
