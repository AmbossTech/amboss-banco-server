import { Injectable } from '@nestjs/common';
import { eachSeries } from 'async';
import { GraphQLError } from 'graphql';
import {
  CreateWalletInput,
  ReducedAccountInfo,
} from 'src/api/wallet/wallet.types';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import {
  WalletAccountDetailsType,
  WalletAccountType,
  WalletType,
} from 'src/repo/wallet/wallet.types';
import { getSHA256Hash } from 'src/utils/crypto/crypto';
import { generateFruitName } from 'src/utils/names/names';

import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class WalletService {
  constructor(
    private walletRepo: WalletRepoService,
    private cryptoService: CryptoService,
  ) {}

  async createWallet(user_id: string, input: CreateWalletInput) {
    const mapped = input.accounts.reduce((p: ReducedAccountInfo[], c) => {
      if (!c) return p;

      if (c.type === WalletAccountType.LIQUID) {
        let accountName = c.name;
        if (!accountName) {
          accountName = generateFruitName();
        }

        const descriptor_hash = getSHA256Hash(c.liquid_descriptor);
        const local_protected_descriptor = this.cryptoService.encryptString(
          c.liquid_descriptor,
        );

        const details: WalletAccountDetailsType = {
          type: WalletAccountType.LIQUID,
          descriptor: '',
          descriptor_hash,
          local_protected_descriptor,
        };

        return [...p, { name: accountName, details }];
      }
      return p;
    }, []);

    let walletName = input.name;

    if (!walletName) {
      const countWallets = await this.walletRepo.countAccountWallets(user_id);
      walletName = `Wallet ${countWallets + 1}`;
    }

    const details = input.details;

    if (details.type !== WalletType.CLIENT_GENERATED) {
      throw new GraphQLError('Error creating this wallet type');
    }

    if (!details.protected_mnemonic) {
      throw new GraphQLError(
        'Client wallet requires you to push an encrypted mnemonic',
      );
    }

    const newWallet = await this.walletRepo.createNewWallet({
      account_id: user_id,
      is_owner: true,
      name: walletName,
      details: {
        type: details.type,
        protected_mnemonic: details.protected_mnemonic,
      },
      secp256k1_key_pair: input.secp256k1_key_pair,
    });

    await eachSeries(mapped, async (info) => {
      await this.walletRepo.createNewAccount(
        info.name,
        newWallet.id,
        info.details,
      );
    });
    return { id: newWallet.id };
  }
}
