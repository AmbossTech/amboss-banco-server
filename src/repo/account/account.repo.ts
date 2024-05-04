import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { NewAccountType } from './account.types';

@Injectable()
export class AccountRepo {
  constructor(private prisma: PrismaService) {}

  findOne(email: string) {
    return this.prisma.account.findUnique({ where: { email } });
  }

  create({
    email,
    master_password_hash,
    password_hint,
    symmetric_key_iv,
    protected_symmetric_key,
    key_pair,
  }: NewAccountType) {
    return this.prisma.account.create({
      data: {
        email,
        master_password_hash,
        password_hint,
        symmetric_key_iv,
        protected_symmetric_key,
        key_pair,
      },
    });
  }
}
