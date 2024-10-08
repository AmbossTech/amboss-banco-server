import { Module } from '@nestjs/common';
import { AmbossModule } from 'src/libs/amboss/amboss.module';
import { AuthModule } from 'src/libs/auth/auth.module';
import { MailModule } from 'src/libs/mail/mail.module';
import { RedlockModule } from 'src/libs/redlock/redlock.module';
import { SideShiftModule } from 'src/libs/sideshift/sideshift.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';
import { PasskeyRepoModule } from 'src/repo/passkey/passkey.module';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import {
  AccountResolver,
  AmbossInfoResolver,
  LoginMutationsResolver,
  PasswordMutationsResolver,
  UserResolver,
  UserSwapInfoResolver,
  UserWalletInfoResolver,
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
    TwoFactorRepoModule,
    PasskeyRepoModule,
    WalletRepoModule,
    MailModule,
  ],
  providers: [
    AccountResolver,
    AccountService,
    UserResolver,
    UserSwapInfoResolver,
    AmbossInfoResolver,
    PasswordMutationsResolver,
    UserWalletInfoResolver,
    LoginMutationsResolver,
  ],
  exports: [AccountService],
})
export class AccountModule {}
