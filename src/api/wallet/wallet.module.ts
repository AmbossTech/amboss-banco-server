import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import {
  MainWalletMutationsResolver,
  WalletMutationsResolver,
} from './resolvers/mutations.resolver';
import {
  MainWalletQueriesResolver,
  SimpleWalletAccountResolver,
  SimpleWalletResolver,
  WalletAccountResolver,
  WalletLiquidAssetInfoResolver,
  WalletLiquidAssetResolver,
  WalletLiquidTransactionResolver,
  WalletQueriesResolver,
  WalletResolver,
} from './resolvers/queries.resolver';
import { EsploraServiceModule } from 'src/libs/esplora/esplora.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';

@Module({
  imports: [WalletRepoModule, EsploraServiceModule, LiquidModule],
  providers: [
    MainWalletMutationsResolver,
    WalletMutationsResolver,
    WalletLiquidTransactionResolver,
    WalletLiquidAssetInfoResolver,
    WalletLiquidAssetResolver,
    SimpleWalletAccountResolver,
    WalletAccountResolver,
    WalletResolver,
    SimpleWalletResolver,
    WalletQueriesResolver,
    MainWalletQueriesResolver,
  ],
})
export class WalletModule {}
