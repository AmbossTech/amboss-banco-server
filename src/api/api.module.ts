import { Module } from '@nestjs/common';
import { GeneralModule } from './general/general.module';
import { AccountModule } from './account/account.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [GeneralModule, AccountModule, WalletModule],
})
export class ApiModule {}
