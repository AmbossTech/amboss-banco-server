import { Module } from '@nestjs/common';
import { AuthModule } from 'src/libs/auth/auth.module';
import { CryptoModule } from 'src/libs/crypto/crypto.module';
import { AccountRepoModule } from 'src/repo/account/account.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';

import { AccountResolver, UserResolver } from './account.resolver';
import { AccountService } from './account.service';

@Module({
  imports: [WalletServiceModule, AccountRepoModule, CryptoModule, AuthModule],
  providers: [AccountResolver, AccountService, UserResolver],
})
export class AccountModule {}
