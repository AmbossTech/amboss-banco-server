import { Module } from '@nestjs/common';
import { TwoFactorRepoModule } from 'src/repo/2fa/2fa.module';
import { AccountRepoModule } from 'src/repo/account/account.module';

import { AccountModule } from '../account/account.module';
import { TwoFactorMutationsResolver, TwoFactorResolver } from './2fa.resolver';
import { TwoFactorService } from './2fa.service';

@Module({
  imports: [AccountModule, TwoFactorRepoModule, AccountRepoModule],
  providers: [TwoFactorResolver, TwoFactorMutationsResolver, TwoFactorService],
})
export class TwoFactorModule {}
