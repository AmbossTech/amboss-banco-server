import { Injectable } from '@nestjs/common';
import { two_fa_method } from '@prisma/client';
import {
  TwoFactorPayloadPasskeyType,
  TwoFactorPayloadType,
} from 'src/libs/2fa/2fa.types';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class TwoFactorRepository {
  constructor(private prisma: PrismaService) {}

  async findAllForAccount(account_id: string) {
    return this.prisma.account_2fa.findMany({
      where: { account_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getMethodsByAccount(account_id: string) {
    return this.prisma.account_2fa.findMany({
      where: {
        account_id,
      },
      include: {
        account: true,
      },
    });
  }

  async get(account_id: string, method: two_fa_method) {
    return this.prisma.account_2fa.findFirst({
      where: {
        account_id,
        method,
      },
    });
  }

  async getPasskeyById(id: string) {
    return this.prisma.account_2fa.findUnique({
      where: { id, method: two_fa_method.PASSKEY },
    });
  }

  async updatePasskeyCounter(id: string, newCounter: number) {
    const passkey = await this.prisma.account_2fa.findUnique({ where: { id } });

    if (!passkey || passkey.payload.type !== 'PASSKEY') {
      throw new Error('Unknown passkey');
    }

    const payload: TwoFactorPayloadPasskeyType = {
      ...passkey.payload,
      counter: newCounter,
    };

    return this.prisma.account_2fa.update({
      where: { id },
      data: { payload },
    });
  }

  async add({
    id,
    account_id,
    method,
    payload,
    enabled = true,
  }: {
    id?: string;
    account_id: string;
    method: two_fa_method;
    payload: TwoFactorPayloadType;
    enabled?: boolean;
  }) {
    return this.prisma.account_2fa.create({
      data: {
        id,
        account_id,
        method,
        payload,
        enabled,
      },
    });
  }
}
