import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { orderBy } from 'lodash';
import { v5 } from 'uuid';

import {
  AssetParentType,
  GetAccountWalletsResult,
  SimpleWallet,
  SimpleWalletAccount,
  Wallet,
  WalletAccount,
  WalletAccountType,
  WalletLiquidAsset,
  WalletLiquidAssetInfo,
  WalletLiquidTransaction,
  WalletQueries,
  WalletTxWithAssetId,
} from '../wallet.types';
import {
  alwaysPresentAssets,
  featuredLiquidAssets,
} from 'src/utils/crypto/crypto';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { CurrentUser } from 'src/auth/auth.decorators';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { EsploraLiquidService } from 'src/libs/esplora/liquid.service';

@Resolver(WalletLiquidTransaction)
export class WalletLiquidTransactionResolver {
  @ResolveField()
  id(@Parent() { tx, asset_id }: WalletTxWithAssetId) {
    return v5(tx.txid().toString() + asset_id, v5.URL);
  }

  @ResolveField()
  tx_id(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.txid().toString();
  }

  @ResolveField()
  balance(@Parent() { tx, asset_id }: WalletTxWithAssetId) {
    return tx.balance().get(asset_id);
  }

  @ResolveField()
  date(@Parent() { tx }: WalletTxWithAssetId) {
    const timestamp = tx.timestamp();
    if (!timestamp) return;
    return new Date(timestamp * 1000).toISOString();
  }

  @ResolveField()
  block_height(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.height();
  }

  @ResolveField()
  fee(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.fee().toString();
  }

  @ResolveField()
  blinded_url(@Parent() { tx }: WalletTxWithAssetId) {
    return `https://blockstream.info/liquid/tx/${tx.txid().toString()}`;
  }

  @ResolveField()
  unblinded_url(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.unblindedUrl('https://blockstream.info/liquid/');
  }
}

@Resolver(WalletLiquidAssetInfo)
export class WalletLiquidAssetInfoResolver {}

@Resolver(WalletLiquidAsset)
export class WalletLiquidAssetResolver {
  constructor(private mempoolLiquid: EsploraLiquidService) {}

  @ResolveField()
  id(@Parent() { asset_id, wallet_id }: AssetParentType) {
    return v5(asset_id + wallet_id, v5.URL);
  }

  @ResolveField()
  async asset_info(@Parent() { asset_id }: AssetParentType) {
    const featured = featuredLiquidAssets.mainnet[asset_id];

    if (featured) return { ...featured, is_featured: true, id: asset_id };

    const apiInfo = await this.mempoolLiquid.getAssetInfo(asset_id);
    return { ...apiInfo, is_featured: false, id: asset_id };
  }

  @ResolveField()
  transactions(
    @Parent() { asset_id, txs }: AssetParentType,
  ): WalletTxWithAssetId[] {
    const assetTxs = txs
      .filter((t) => t.balance().get(asset_id))
      .map((tx) => ({ tx, asset_id }));

    return assetTxs;
  }
}

@Resolver(SimpleWalletAccount)
export class SimpleWalletAccountResolver {
  @ResolveField()
  async account_type(@Parent() account: wallet_account) {
    return (account.details as any).type;
  }
}

@Resolver(WalletAccount)
export class WalletAccountResolver {
  constructor(private liquidService: LiquidService) {}

  @ResolveField()
  async account_type(@Parent() account: wallet_account) {
    return (account.details as any).type;
  }

  @ResolveField()
  async liquid_assets(
    @Parent() account: wallet_account,
  ): Promise<AssetParentType[]> {
    if ((account.details as any).type !== WalletAccountType.LIQUID) {
      return [];
    }

    const { descriptor } = account.details as any;

    const balances = await this.liquidService.getBalances(descriptor);
    const txs = await this.liquidService.getTransactions(descriptor);

    const alwaysShownBalances = new Map<string, number>();

    alwaysPresentAssets.mainnet.forEach((a) => alwaysShownBalances.set(a, 0));

    const mergedAssets = new Map([...alwaysShownBalances, ...balances]);

    const balanceArray = Array.from(mergedAssets, ([asset_id, balance]) => ({
      wallet_id: account.id,
      asset_id,
      balance,
      txs,
    }));

    return orderBy(balanceArray, 'asset_id', 'desc');
  }
}

@Resolver(Wallet)
export class WalletResolver {
  @ResolveField()
  id(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.id;
  }

  @ResolveField()
  name(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.name;
  }

  @ResolveField()
  accounts(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.wallet_account;
  }
}

@Resolver(SimpleWallet)
export class SimpleWalletResolver {
  @ResolveField()
  id(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.id;
  }

  @ResolveField()
  name(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.name;
  }

  @ResolveField()
  accounts(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.wallet_account;
  }
}

@Resolver(WalletQueries)
export class WalletQueriesResolver {
  constructor(private walletRepo: WalletRepoService) {}

  @ResolveField()
  id(@CurrentUser() { user_id }: any) {
    return user_id;
  }

  @ResolveField()
  async find_many(@CurrentUser() { user_id }: any) {
    return this.walletRepo.getAccountWallets(user_id);
  }

  @ResolveField()
  async find_one(@Args('id') id: string, @CurrentUser() { user_id }: any) {
    const wallet = await this.walletRepo.getAccountWallet(user_id, id);

    if (!wallet) {
      throw new GraphQLError('No wallet found');
    }

    return wallet;
  }
}

@Resolver()
export class MainWalletQueriesResolver {
  @Query(() => WalletQueries)
  async wallets() {
    return {};
  }
}
