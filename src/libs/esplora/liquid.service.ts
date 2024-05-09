import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import { AssetSchema } from './esplora.validation';

@Injectable()
export class EsploraLiquidService {
  constructor(private configService: ConfigService) {}

  url = this.configService.getOrThrow<string>('urls.esplora.liquid');

  // async getRecommendedFees() {
  //   const response = await fetch(`${this.url}/api/v1/fees/recommended`);
  //   return response.json();
  // }

  // async getAddress(address: string) {
  //   const response = await fetch(`${this.url}/api/address/${address}`);

  //   const status = response.status;

  //   console.log(status);

  //   const text = await response.text();

  //   try {
  //     const json = JSON.parse(text);
  //     return AddressSchema.parse(json);
  //   } catch (error) {
  //     console.log(text);
  //   }
  // }

  // async getUnspentUtxos(address: string) {
  //   const response = await fetch(`${this.url}/api/address/${address}/utxo`);

  //   const status = response.status;

  //   console.log(status);

  //   const text = await response.text();

  //   try {
  //     return JSON.parse(text);
  //   } catch (error) {
  //     console.log(text);
  //   }
  // }

  // async getTransactions(address: string) {
  //   const response = await fetch(`${this.url}/api/address/${address}/txs`);

  //   const status = response.status;

  //   console.log(status);

  //   const text = await response.text();

  //   try {
  //     return JSON.parse(text);
  //   } catch (error) {
  //     console.log(text);
  //   }
  // }

  // async getTransactionHex(txid: string) {
  //   const response = await fetch(`${this.url}/api/tx/${txid}/hex`);

  //   const status = response.status;

  //   console.log(status);

  //   return response.text();
  // }

  async postTransactionHex(tx_hex: string) {
    const response = await fetch(`${this.url}/api/tx`, {
      body: tx_hex,
      method: 'POST',
    });

    const status = response.status;

    console.log(status);

    return response.text();
  }

  async getAssetInfo(asset_id: string) {
    const response = await fetch(`${this.url}/api/asset/${asset_id}`);

    const status = response.status;

    console.log(status);

    const text = await response.text();

    try {
      const parsed = JSON.parse(text);

      return AssetSchema.parse(parsed);
    } catch (error) {
      console.log(text);
    }
  }
}
