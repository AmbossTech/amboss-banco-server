import { Module } from '@nestjs/common';
import { WalletRepoModule } from 'src/repo/wallet/wallet.module';
import {
  MainWalletMutationsResolver,
  WalletMutationsResolver,
} from './resolvers/mutations.resolver';
import {
  FiatInfoResolver,
  LiquidAccountResolver,
  MainWalletQueriesResolver,
  SimpleWalletAccountResolver,
  SimpleWalletResolver,
  WalletAccountResolver,
  WalletDetailsResolver,
  WalletLiquidAssetInfoResolver,
  WalletLiquidAssetResolver,
  WalletLiquidTransactionResolver,
  WalletQueriesResolver,
  WalletResolver,
} from './resolvers/queries.resolver';
import { EsploraServiceModule } from 'src/libs/esplora/esplora.module';
import { LiquidModule } from 'src/libs/liquid/liquid.module';
import { FiatModule } from 'src/libs/fiat/fiat.module';
import { WalletServiceModule } from 'src/libs/wallet/wallet.module';

@Module({
  imports: [
    WalletServiceModule,
    WalletRepoModule,
    EsploraServiceModule,
    LiquidModule,
    FiatModule,
  ],
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
    LiquidAccountResolver,
    WalletDetailsResolver,
    FiatInfoResolver,
  ],
})
export class WalletModule {}
