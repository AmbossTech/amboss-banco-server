import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { orderBy } from 'lodash';
import {
  Address,
  AssetId,
  EsploraClient,
  Mnemonic,
  Network,
  Pset,
  Signer,
  TxBuilder,
  Update,
  Wollet,
} from 'lwk_wasm';

import { CreateLiquidTransactionInput } from '../../api/wallet/wallet.types';
import { getWalletFromDescriptor } from './lwk.utils';
import { getSHA256Hash } from 'src/utils/crypto/crypto';
import { RedisService } from '../redis/redis.service';

export const getUpdateKey = (descriptor: string) =>
  `banco-walletdelta-${getSHA256Hash(descriptor)}-v4`;

@Injectable()
export class LiquidService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  // FOR TESTING. This will be on the client in the future
  async signPset(descriptor: string, base64: string): Promise<Pset> {
    const mnemonic = this.config.getOrThrow('mnemonic');

    const network = Network.mainnet();

    const signer = new Signer(new Mnemonic(mnemonic), network);

    const psetFromBase64 = new Pset(base64);
    const signedPset = signer.sign(psetFromBase64);

    const wollet = await this.getUpdatedWallet(descriptor);

    const finalizedPset = wollet.finalize(signedPset);

    return finalizedPset;
  }

  async createPset(
    descriptor: string,
    input: CreateLiquidTransactionInput,
  ): Promise<Pset> {
    const network = Network.mainnet();
    let txBuilder = new TxBuilder(network);

    input.recipients.forEach((recipient) => {
      const { address, amount, asset_id } = recipient;

      if (!!asset_id) {
        txBuilder = txBuilder.addRecipient(
          new Address(address),
          BigInt(amount),
          new AssetId(asset_id),
        );
      } else {
        txBuilder = txBuilder.addLbtcRecipient(
          new Address(address),
          BigInt(amount),
        );
      }
    });

    txBuilder = txBuilder.feeRate(input.fee_rate);

    const wollet = await this.getUpdatedWallet(descriptor);
    return txBuilder.finish(wollet);
  }

  async getUpdate(wollet: Wollet, descriptor: string): Promise<Update | null> {
    const key = getUpdateKey(descriptor);

    const cachedUpdate = await this.redis.get<string>(key);

    if (!!cachedUpdate) {
      const uint8array = Buffer.from(cachedUpdate, 'hex');
      return new Update(uint8array);
    }

    const liquidEsploraUrl = this.config.getOrThrow('urls.esplora.liquid');

    const client = new EsploraClient(liquidEsploraUrl + '/api');

    const update = await client.fullScan(wollet);

    if (update) {
      const uint8array = update.serialize();
      const string = Buffer.from(uint8array).toString('hex');

      await this.redis.set(key, string, { ttl: 60 * 60 * 24 }); // Cached for one day

      return update;
    }

    return null;
  }

  async getUpdatedWallet(descriptor: string): Promise<Wollet> {
    const wollet = getWalletFromDescriptor(descriptor);

    const update = await this.getUpdate(wollet, descriptor);

    if (update) {
      wollet.applyUpdate(update);
    }

    return wollet;
  }

  async getBalances(descriptor: string): Promise<Map<string, number>> {
    const wollet = await this.getUpdatedWallet(descriptor);

    return wollet.balance();
  }

  async getNewAddress(descriptor: string) {
    await this.getBalances(descriptor);

    const wollet = await this.getUpdatedWallet(descriptor);

    const nextAddress = wollet
      .address()
      .address()
      .toUnconfidential()
      .toString();

    console.log(nextAddress);

    const addressesToCheck = Array.from(Array(10).keys()).map((i) => {
      return wollet.address(i).address().toUnconfidential().toString();
    });
    console.log(addressesToCheck);

    await this.getTransactions(descriptor);
  }

  async getTransactions(descriptor: string) {
    const wollet = await this.getUpdatedWallet(descriptor);
    const txs = wollet.transactions();
    return orderBy(txs, (t) => t.timestamp(), 'desc');
  }
}
