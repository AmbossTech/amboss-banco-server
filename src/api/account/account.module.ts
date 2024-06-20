import { Module } from '@nestjs/common';
import { AccountResolver, UserResolver } from './account.resolver';
import { AccountService } from './account.service';
import { AccountRepoModule } from 'src/repo/account/account.module';
import { CryptoModule } from 'src/libs/crypto/crypto.module';
import { AuthModule } from 'src/libs/auth/auth.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';

@Module({
  imports: [WalletServiceModule, AccountRepoModule, CryptoModule, AuthModule],
  providers: [AccountResolver, AccountService, UserResolver],
})
export class AccountModule {}
