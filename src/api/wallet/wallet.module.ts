import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import {
  MainWalletMutationsResolver,
  WalletMutationsResolver,
} from './wallet.resolver';

@Module({
  imports: [WalletRepoModule],
  providers: [MainWalletMutationsResolver, WalletMutationsResolver],
})
export class WalletModule {}
