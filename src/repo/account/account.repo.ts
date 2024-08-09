import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';

import { ChangePasswordType, NewAccountType } from './account.types';

@Injectable()
export class AccountRepo {
  constructor(private prisma: PrismaService) {}

  findOneById(id: string) {
    return this.prisma.account.findUnique({ where: { id } });
  }

  findOneByIdWithWalletIds(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      select: { wallets: { select: { wallet_id: true } } },
    });
  }

  findOneByIdWithTwoFactor(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { account_2fa: true },
    });
  }

  findOneByIdWithPasskeys(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { account_passkey: true },
    });
  }

  findOne(email: string) {
    return this.prisma.account.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
  }

  async updateRefreshToken(id: string, refresh_token_hash: string | null) {
    return this.prisma.account.update({
      where: { id },
      data: {
        refresh_token_hash,
        last_login_at: new Date(),
      },
    });
  }

  async create({
    email,
    master_password_hash,
    password_hint,
    protected_symmetric_key,
    secp256k1_key_pair,
  }: NewAccountType) {
    return this.prisma.account.create({
      data: {
        email,
        master_password_hash,
        password_hint,
        protected_symmetric_key,
        secp256k1_key_pair,
      },
    });
  }

  async updateCredentials({
    account_id,
    master_password_hash,
    protected_symmetric_key,
    password_hint,
  }: ChangePasswordType) {
    return this.prisma.account.update({
      where: { id: account_id },
      data: {
        master_password_hash,
        protected_symmetric_key,
        password_hint,
      },
    });
  }

  async getByWalletId(walletAccountId: string) {
    return this.prisma.account.findMany({
      where: {
        wallets: {
          some: {
            wallet: {
              wallet_account: {
                some: {
                  id: walletAccountId,
                },
              },
            },
          },
        },
      },
    });
  }
}
