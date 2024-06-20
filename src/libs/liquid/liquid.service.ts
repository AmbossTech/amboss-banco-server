import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  AddressResult,
  AssetId,
  EsploraClient,
  Network,
  Pset,
  TxBuilder,
  Update,
  Wollet,
} from 'lwk_wasm';

import { getWalletFromDescriptor } from './lwk.utils';
import { getSHA256Hash } from 'src/utils/crypto/crypto';
import { RedisService } from '../redis/redis.service';
import { EsploraLiquidService } from '../esplora/liquid.service';
import { PayLiquidAddressInput } from 'src/api/pay/pay.types';
import { auto } from 'async';
import { GetUpdatedWalletAutoType, LiquidRedisCache } from './liquid.types';
import { CustomLogger, Logger } from '../logging';

export const getUpdateKey = (descriptor: string) =>
  `banco-walletdelta-${getSHA256Hash(descriptor)}`;

const getBlockedAddressKey = (address: string) =>
  `banco-blocked-address-${address}`;

@Injectable()
export class LiquidService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
    private esploraLiquid: EsploraLiquidService,
    @Logger('LiquidService') private logger: CustomLogger,
  ) {}

  async createPset(
    descriptor: string,
    input: PayLiquidAddressInput,
  ): Promise<Pset> {
    const network = Network.mainnet();
    let txBuilder = new TxBuilder(network);

    if (!!input.send_all_lbtc) {
      txBuilder = txBuilder
        .drainLbtcWallet()
        .drainLbtcTo(new Address(input.recipients[0].address));
    } else {
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
    }

    txBuilder = txBuilder.feeRate(input.fee_rate);

    const wollet = await this.getUpdatedWallet(descriptor, 'partial');
    return txBuilder.finish(wollet);
  }

  async getUpdatedWallet(
    descriptor: string,
    updateType: 'partial' | 'full' | 'none',
  ): Promise<Wollet> {
    const wollet = getWalletFromDescriptor(descriptor);

    const key = getUpdateKey(descriptor);

    return auto<GetUpdatedWalletAutoType>({
      getUpdates: async (): Promise<GetUpdatedWalletAutoType['getUpdates']> => {
        if (updateType === 'full') return { deltaStrings: [], deltas: [] };

        const deltaStrings = await this.redis.get<LiquidRedisCache>(key);

        if (!deltaStrings) return { deltaStrings: [], deltas: [] };

        const deltas = deltaStrings.map((u) => {
          const uint8array = Buffer.from(u, 'hex');
          return new Update(uint8array);
        });

        return { deltaStrings, deltas };
      },

      getWolletWithUpdates: [
        'getUpdates',
        async ({
          getUpdates,
        }: Pick<GetUpdatedWalletAutoType, 'getUpdates'>): Promise<
          GetUpdatedWalletAutoType['getWolletWithUpdates']
        > => {
          if (!!getUpdates.deltas.length) {
            getUpdates.deltas.forEach((u) => {
              wollet.applyUpdate(u);
            });
          }
          return wollet;
        },
      ],

      updateWollet: [
        'getUpdates',
        'getWolletWithUpdates',
        async ({
          getUpdates,
          getWolletWithUpdates,
        }: Pick<
          GetUpdatedWalletAutoType,
          'getUpdates' | 'getWolletWithUpdates'
        >): Promise<GetUpdatedWalletAutoType['updateWollet']> => {
          if (updateType === 'none') return getWolletWithUpdates;

          const liquidEsploraUrl = this.config.getOrThrow(
            'urls.esplora.liquid',
          );

          const client = new EsploraClient(liquidEsploraUrl, true);

          const start = new Date();
          this.logger.debug('Scan start time', { start: start.toISOString() });

          const update = await client.fullScan(getWolletWithUpdates);

          const end = new Date();

          this.logger.debug('Scan end time', {
            end: end.toISOString(),
            duration: end.getTime() - start.getTime(),
          });

          if (!update) return getWolletWithUpdates;
          if (update.onlyTip()) return getWolletWithUpdates;

          const uint8array = update.serialize();
          const deltaString = Buffer.from(uint8array).toString('hex');

          const allDeltas = [...getUpdates.deltaStrings, deltaString];

          await this.redis.set<LiquidRedisCache>(key, allDeltas, {
            ttl: 60 * 60 * 24 * 7,
          }); // Cached for one week

          getWolletWithUpdates.applyUpdate(update);

          return getWolletWithUpdates;
        },
      ],
    }).then((results) => results.updateWollet);
  }

  async broadcastPset(base64_pset: string): Promise<string> {
    const pset = new Pset(base64_pset);

    const tx_hex = pset.extractTx().toString();

    const tx_id = await this.esploraLiquid.postTransactionHex(tx_hex);

    return tx_id;
  }

  // async getBalances(descriptor: string): Promise<Map<string, number>> {
  //   const wollet = await this.getUpdatedWallet(descriptor);

  //   return wollet.balance();
  // }

  // async getNewAddress(descriptor: string) {
  //   await this.getBalances(descriptor);

  //   const wollet = await this.getUpdatedWallet(descriptor);

  //   const nextAddress = wollet
  //     .address()
  //     .address()
  //     .toUnconfidential()
  //     .toString();

  //   console.log(nextAddress);

  //   const addressesToCheck = Array.from(Array(10).keys()).map((i) => {
  //     return wollet.address(i).address().toUnconfidential().toString();
  //   });
  //   console.log(addressesToCheck);

  //   await this.getTransactions(descriptor);
  // }

  // async getTransactions(descriptor: string) {
  //   const wollet = await this.getUpdatedWallet(descriptor);
  //   const txs = wollet.transactions();
  //   return orderBy(txs, (t) => t.timestamp(), 'desc');
  // }

  async getOnchainAddress(
    descriptor: string,
    lock = false,
  ): Promise<AddressResult> {
    const wollet = await this.getUpdatedWallet(descriptor, 'partial');

    let lastUsedIndex = wollet.address().index();
    let foundLastUnused = false;

    while (!foundLastUnused) {
      const address = wollet.address(lastUsedIndex).address().toString();

      const addressBlocked = await this.redis.get(
        getBlockedAddressKey(address),
      );

      if (!addressBlocked) {
        foundLastUnused = true;
      } else {
        lastUsedIndex++;
      }
    }

    const address = wollet.address(lastUsedIndex);

    if (lock) {
      await this.redis.set(
        getBlockedAddressKey(address.address().toString()),
        true,
        { ttl: 5 * 60 },
      );
    }

    return address;
  }
}
