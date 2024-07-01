import { Module } from '@nestjs/common';

import { WalletRepoService } from './wallet.repo';

@Module({
  providers: [WalletRepoService],
  exports: [WalletRepoService],
})
export class WalletRepoModule {}
