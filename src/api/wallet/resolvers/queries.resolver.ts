import { ConfigService } from '@nestjs/config';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { wallet_account } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { orderBy } from 'lodash';
import { WalletContactsParent } from 'src/api/contact/contact.types';
import { WalletSwapsParent } from 'src/api/swaps/swaps.types';
import { CurrentUser } from 'src/auth/auth.decorators';
import { ConfigSchemaType } from 'src/libs/config/validation';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { EsploraLiquidService } from 'src/libs/esplora/liquid.service';
import { FiatService } from 'src/libs/fiat/fiat.service';
import { LiquidService } from 'src/libs/liquid/liquid.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import {
  WalletAccountDetailsType,
  WalletAccountType,
} from 'src/repo/wallet/wallet.types';
import {
  alwaysPresentAssets,
  featuredLiquidAssets,
} from 'src/utils/crypto/crypto';
import { v5 } from 'uuid';

import {
  AssetInfoParent,
  AssetParentType,
  FiatInfo,
  GetAccountWalletsResult,
  LiquidAccount,
  LiquidAccountParentType,
  LiquidAsset,
  LiquidAssetInfo,
  LiquidTransaction,
  MoneyAddress,
  MoneyAddressParent,
  Secp256k1KeyPair,
  SimpleWallet,
  SimpleWalletAccount,
  Wallet,
  WalletAccount,
  WalletDetails,
  WalletQueries,
  WalletTxWithAssetId,
} from '../wallet.types';

@Resolver(FiatInfo)
export class FiatInfoResolver {
  constructor(private fiatService: FiatService) {}

  @ResolveField()
  id() {
    return v5('FiatInfo', v5.URL);
  }

  @ResolveField()
  async fiat_to_btc() {
    return this.fiatService.getLatestBtcPrice();
  }
}

@Resolver(LiquidTransaction)
export class WalletLiquidTransactionResolver {
  constructor(private mempoolLiquid: EsploraLiquidService) {}

  @ResolveField()
  id(@Parent() { tx, asset_id, wallet_account_id }: WalletTxWithAssetId) {
    return v5(tx.txid().toString() + asset_id + wallet_account_id, v5.URL);
  }

  @ResolveField()
  tx_id(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.txid().toString();
  }

  @ResolveField()
  balance(@Parent() { tx, asset_id }: WalletTxWithAssetId) {
    return tx.balance().get(asset_id).toString();
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
  fiat_info() {
    return {};
  }

  @ResolveField()
  unblinded_url(@Parent() { tx }: WalletTxWithAssetId) {
    return tx.unblindedUrl('https://blockstream.info/liquid/');
  }

  @ResolveField()
  async asset_info(
    @Parent() { asset_id }: WalletTxWithAssetId,
  ): Promise<AssetInfoParent> {
    const featured = featuredLiquidAssets.mainnet[asset_id];

    if (featured) return { ...featured, is_featured: true, id: asset_id };

    const apiInfo = await this.mempoolLiquid.getAssetInfo(asset_id);
    return { ...apiInfo, is_featured: false, id: asset_id };
  }
}

@Resolver(LiquidAssetInfo)
export class WalletLiquidAssetInfoResolver {}

@Resolver(LiquidAsset)
export class WalletLiquidAssetResolver {
  constructor(private mempoolLiquid: EsploraLiquidService) {}

  @ResolveField()
  id(@Parent() { asset_id, wallet_id }: AssetParentType) {
    return v5(asset_id + wallet_id, v5.URL);
  }

  @ResolveField()
  balance(@Parent() { balance }: AssetParentType) {
    return balance.toString();
  }

  @ResolveField()
  fiat_info() {
    return {};
  }

  @ResolveField()
  async asset_info(
    @Parent() { asset_id }: AssetParentType,
  ): Promise<AssetInfoParent> {
    const featured = featuredLiquidAssets.mainnet[asset_id];

    if (featured) return { ...featured, is_featured: true, id: asset_id };

    const apiInfo = await this.mempoolLiquid.getAssetInfo(asset_id);
    return { ...apiInfo, is_featured: false, id: asset_id };
  }
}

@Resolver(LiquidAccount)
export class LiquidAccountResolver {
  @ResolveField()
  id(@Parent() { descriptor }: LiquidAccountParentType) {
    return v5(descriptor, v5.URL);
  }

  @ResolveField()
  assets(
    @Parent() { walletAccount, wollet }: LiquidAccountParentType,
  ): AssetParentType[] {
    const balances = wollet.balance();

    const alwaysShownBalances = new Map<string, number>();

    alwaysPresentAssets.mainnet.forEach((a) => alwaysShownBalances.set(a, 0));

    const mergedAssets = new Map<string, number>([
      ...alwaysShownBalances,
      ...balances,
    ]);

    const balanceArray = Array.from(mergedAssets, ([asset_id, balance]) => ({
      wallet_id: walletAccount.id,
      asset_id,
      balance,
    }));

    return orderBy(balanceArray, 'asset_id', 'desc');
  }

  @ResolveField()
  transactions(@Parent() { wollet, walletAccount }: LiquidAccountParentType) {
    const txs = wollet.transactions();

    const transactions: WalletTxWithAssetId[] = [];

    txs.forEach((tx) => {
      const balances: Map<string, number> = tx.balance();
      balances.forEach((_, key) =>
        transactions.push({
          tx,
          asset_id: key,
          wallet_account_id: walletAccount.id,
        }),
      );
    });

    const ordered = orderBy(transactions, (t) => t.tx.timestamp(), 'desc');

    return ordered;
  }
}

@Resolver(SimpleWalletAccount)
export class SimpleWalletAccountResolver {
  @ResolveField()
  async account_type(@Parent() account: wallet_account) {
    return account.details.type;
  }
}

@Resolver(WalletAccount)
export class WalletAccountResolver {
  constructor(
    private liquidService: LiquidService,
    private cryptoService: CryptoService,
  ) {}

  @ResolveField()
  async account_type(@Parent() account: wallet_account) {
    return account.details.type;
  }

  @ResolveField()
  async descriptor(@Parent() account: wallet_account) {
    const descriptor = this.cryptoService.decryptString(
      account.details.local_protected_descriptor,
    );

    return descriptor;
  }

  @ResolveField()
  async liquid(
    @Parent() account: wallet_account,
  ): Promise<LiquidAccountParentType | null> {
    if (account.details.type !== WalletAccountType.LIQUID) {
      return null;
    }

    const descriptor = this.cryptoService.decryptString(
      account.details.local_protected_descriptor,
    );

    const wollet = await this.liquidService.getUpdatedWallet(
      descriptor,
      'none',
    );

    return { descriptor, walletAccount: account, wollet };
  }
}

@Resolver(WalletDetails)
export class WalletDetailsResolver {
  @ResolveField()
  id(@Parent() parent: WalletAccountDetailsType) {
    return v5(JSON.stringify(parent), v5.URL);
  }
}

@Resolver(MoneyAddress)
export class MoneyAddressResolver {
  constructor(private config: ConfigService) {}

  @ResolveField()
  id(@Parent() parent: MoneyAddressParent) {
    return v5(JSON.stringify(parent), v5.URL);
  }

  @ResolveField()
  user(@Parent() { user }: MoneyAddressParent) {
    return user;
  }

  @ResolveField()
  domains() {
    return this.config.getOrThrow<ConfigSchemaType['server']['domains']>(
      'server.domains',
    );
  }
}

@Resolver(Wallet)
export class WalletResolver {
  constructor(private config: ConfigService) {}

  @ResolveField()
  id(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.id;
  }

  @ResolveField()
  name(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.name;
  }

  @ResolveField()
  contacts(@Parent() parent: GetAccountWalletsResult): WalletContactsParent {
    return { wallet_id: parent.id };
  }

  @ResolveField()
  secp256k1_key_pair(
    @Parent() parent: GetAccountWalletsResult,
  ): Secp256k1KeyPair {
    return {
      id: parent.id,
      encryption_pubkey: parent.secp256k1_key_pair.public_key,
      protected_encryption_private_key:
        parent.secp256k1_key_pair.protected_private_key,
    };
  }

  @ResolveField()
  money_address(@Parent() parent: GetAccountWalletsResult) {
    return [{ user: parent.money_address_user }];
  }

  @ResolveField()
  details(@Parent() parent: GetAccountWalletsResult) {
    return parent.details;
  }

  @ResolveField()
  accounts(@Parent() parent: GetAccountWalletsResult) {
    return parent.wallet.wallet_account;
  }

  @ResolveField()
  swaps(@Parent() parent: GetAccountWalletsResult): WalletSwapsParent {
    return { wallet_id: parent.wallet_id };
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
  async find_one(
    @Args('id') id: string,
    @CurrentUser() { user_id }: any,
  ): Promise<GetAccountWalletsResult> {
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
