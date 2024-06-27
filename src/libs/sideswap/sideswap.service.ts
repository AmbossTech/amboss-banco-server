import { Injectable } from '@nestjs/common';
import { SideSwapRestApi } from './sideswap.rest';
import {
  LiquidPriceStreamInput,
  LiquidSwapInput,
} from 'src/api/swaps/swaps.types';
import { SideSwapSwapInput } from './sideswap.types';

@Injectable()
export class SideSwapService {
  constructor(private sideswapApi: SideSwapRestApi) {}

  getPriceQuery(input: LiquidPriceStreamInput) {
    const { asset_id, buy_bitcoin, send_amount } = input;
    return this.sideswapApi.getPriceStream(asset_id, buy_bitcoin, send_amount);
  }

  createSwap(input: LiquidSwapInput) {
    return this.sideswapApi.startSwapWeb(input);
  }

  startSwap(input: SideSwapSwapInput) {
    return this.sideswapApi.swapStart(input);
  }
}
