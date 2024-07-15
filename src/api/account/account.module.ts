import { Module } from '@nestjs/common';
import { AmbossModule } from 'src/libs/amboss/amboss.module';
import { AuthModule } from 'src/libs/auth/auth.module';
import { RedlockModule } from 'src/libs/redlock/redlock.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import {
  AccountResolver,
  AmbossInfoResolver,
  UserResolver,
  UserSwapInfoResolver,
} from './account.resolver';
import { AccountService } from './account.service';

@Module({
  imports: [
    WalletServiceModule,
    AccountRepoModule,
    AuthModule,
    SideShiftModule,
    AmbossModule,
    RedlockModule,
  ],
  providers: [
    AccountResolver,
    AccountService,
    UserResolver,
    UserSwapInfoResolver,
    AmbossInfoResolver,
  ],
})
export class AccountModule {}
