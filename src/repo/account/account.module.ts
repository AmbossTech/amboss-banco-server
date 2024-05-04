import { Module } from '@nestjs/common';
import { AccountRepo } from './account.repo';

@Module({ providers: [AccountRepo], exports: [AccountRepo] })
export class AccountRepoModule {}
