import { Injectable } from '@nestjs/common';
import { Client } from 'rpc-websockets';
import { LiquidSwapInput } from 'src/api/swaps/swaps.types';
import { SideSwapSwapInput, startSwapWebResponse } from './sideswap.types';

@Injectable()
export class SideSwapRestApi {
  private url: string;
  private client: Client;

  constructor() {
    this.url = 'wss://api-testnet.sideswap.io/json-rpc-ws';
    this.client = new Client(this.url);
  }

  async getPriceStream(asset: string, buyBitcoin: boolean, sendAmount: number) {
    const res = await this.client.call('subscribe_price_stream', {
      asset,
      send_bitcoins: !buyBitcoin,
      send_amount: sendAmount,
    });
    console.log({ res });
    return res;
  }

  async startSwapWeb(input: LiquidSwapInput) {
    const { asset, recv_amount, send_amount, send_btc, price } = input;
    const response = await this.client.call('start_swap_web', {
      asset,
      send_bitcoins: send_btc,
      price,
      send_amount,
      recv_amount,
    });
    const parsed = startSwapWebResponse.safeParse(response);
    if (parsed.error) {
      console.error({ response });
      throw new Error(`Failed to create swap`);
    }
    return parsed.data;
  }

  async swapStart(input: SideSwapSwapInput) {
    const response = await this.client.call('swap_start', input);
    // console.log({ response });
    return response;
  }
}
