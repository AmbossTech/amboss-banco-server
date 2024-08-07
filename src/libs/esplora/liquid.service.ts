import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import { AssetSchema } from './esplora.validation';

@Injectable()
export class EsploraLiquidService {
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('urls.esplora.liquid');
  }

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
    const response = await fetch(`${this.baseUrl}/tx`, {
      body: tx_hex,
      method: 'POST',
    });

    return response.text();
  }

  async getAssetInfo(asset_id: string) {
    try {
      const response = await fetch(`${this.baseUrl}/asset/${asset_id}`);

      const text = await response.text();

      const parsed = JSON.parse(text);

      return AssetSchema.parse(parsed);
    } catch (error) {
      return { name: '', ticker: '', precision: 0 };
    }
  }
}
