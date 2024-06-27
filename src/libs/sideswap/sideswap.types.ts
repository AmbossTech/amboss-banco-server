import { z } from 'zod';

export type SideSwapSwapInput = {
  order_id: string;
  inputs: SideSwapUtxo[];
  send_asset: string;
  send_amount: number;
  recv_asset: string;
  recv_amount: number;
  /**
   * Blinded address
   */
  recv_addr: string;
  /**
   * Blinded address
   */
  change_addr: string;
};

export type SideSwapUtxo = {
  txid: string;
  vout: number;
  redeem_script?: string;
  asset: string;
  asset_bf: string;
  value: number;
  value_bf: string;
};

export const startSwapWebResponse = z.object({
  id: z.number(),
  method: z.string(),
  result: z.object({
    order_id: z.string(),
    recv_amount: z.number(),
    recv_asset: z.string(),
    send_amount: z.number(),
    send_asset: z.string(),
    upload_url: z.string(),
  }),
});
