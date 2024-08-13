import { Injectable } from '@nestjs/common';
import { TwoFactorPayloadPasskeyType } from 'src/libs/2fa/2fa.types';
import { PrismaService } from 'src/libs/prisma/prisma.service';

@Injectable()
export class PasskeyRepository {
  constructor(private prisma: PrismaService) {}

  async findAllForAccount(account_id: string) {
    return this.prisma.account_passkey.findMany({
      where: { account_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPasskeyById(id: string) {
    return this.prisma.account_passkey.findUnique({
      where: { id },
    });
  }

  async getPasskeyByUserHandle(id: string) {
    return this.prisma.account_passkey.findFirst({
      where: { payload: { path: ['webAuthnUserID'], equals: id } },
      include: { account: true },
    });
  }

  async updatePasskeyCounter(id: string, newCounter: number) {
    const passkey = await this.prisma.account_passkey.findUnique({
      where: { id },
    });

    if (!passkey) {
      throw new Error('Unknown passkey');
    }

    const payload: TwoFactorPayloadPasskeyType = {
      ...passkey.payload,
      counter: newCounter,
    };

    return this.prisma.account_passkey.update({
      where: { id },
      data: { payload },
    });
  }

  async updatePasskeySymmetricKey(id: string, protected_symmetric_key: string) {
    return this.prisma.account_passkey.update({
      where: { id },
      data: { protected_symmetric_key },
    });
  }

  async addProtectedSymmetricKey(id: string, protected_symmetric_key: string) {
    return this.prisma.account_passkey.update({
      where: { id },
      data: { protected_symmetric_key },
    });
  }

  async add({
    id,
    account_id,
    encryption_available,
    payload,
    enabled = true,
  }: {
    id?: string;
    account_id: string;
    encryption_available: boolean;
    payload: TwoFactorPayloadPasskeyType;
    enabled?: boolean;
  }) {
    return this.prisma.account_passkey.create({
      data: {
        id,
        account_id,
        encryption_available,
        payload,
        enabled,
      },
    });
  }
}
