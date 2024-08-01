import { Injectable } from '@nestjs/common';
import { two_fa_method } from '@prisma/client';
import { TwoFactorPayloadType } from 'src/libs/2fa/2fa.types';
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

  async add(
    account_id: string,
    method: two_fa_method,
    payload: TwoFactorPayloadType,
    enabled = true,
  ) {
    return this.prisma.account_2fa.create({
      data: {
        account_id,
        method,
        payload,
        enabled,
      },
    });
  }
}
