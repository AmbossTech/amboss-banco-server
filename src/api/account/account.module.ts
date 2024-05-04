import { Module } from '@nestjs/common';
import { AccountResolver } from './account.resolver';
import { AccountService } from './account.service';
import { AccountRepoModule } from 'src/repo/account/account.module';
import { CryptoModule } from 'src/libs/crypto/crypto.module';

@Module({
  imports: [AccountRepoModule, CryptoModule],
  providers: [AccountResolver, AccountService],
})
export class AccountModule {}
