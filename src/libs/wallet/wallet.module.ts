import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

import { WalletService } from './wallet.service';

@Module({
  imports: [WalletRepoModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletServiceModule {}
