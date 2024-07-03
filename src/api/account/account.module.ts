import { Module } from '@nestjs/common';
import { AuthModule } from 'src/libs/auth/auth.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import {
  AccountResolver,
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
  ],
  providers: [
    AccountResolver,
    AccountService,
    UserResolver,
    UserSwapInfoResolver,
  ],
})
export class AccountModule {}
