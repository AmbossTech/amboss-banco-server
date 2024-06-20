import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';

@Module({
  imports: [WalletRepoModule],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletServiceModule {}
