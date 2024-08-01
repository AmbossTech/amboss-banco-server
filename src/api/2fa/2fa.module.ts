import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { AccountModule } from '../account/account.module';
import {
  SimpleTwoFactorResolver,
  TwoFactorMainMutationResolver,
  TwoFactorMainQueryResolver,
  TwoFactorMutationsResolver,
  TwoFactorQueriesResolver,
} from './2fa.resolver';
import { TwoFactorService } from './2fa.service';

@Module({
  imports: [AccountModule, TwoFactorRepoModule, AccountRepoModule],
  providers: [
    TwoFactorMutationsResolver,
    TwoFactorMainMutationResolver,
    TwoFactorMainQueryResolver,
    TwoFactorService,
    TwoFactorQueriesResolver,
    SimpleTwoFactorResolver,
  ],
})
export class TwoFactorModule {}
