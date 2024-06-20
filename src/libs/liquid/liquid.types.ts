import { Update, Wollet } from 'lwk_wasm';

export type GetUpdatedWalletAutoType = {
  getUpdates: {
    deltaStrings: string[];
    deltas: Update[];
  };
  getWolletWithUpdates: Wollet;
  updateWollet: Wollet;
};

export type LiquidRedisCache = string[];
