import { z } from 'zod';

// export const AddressSchema = z.object({
//   address: z.string(),
//   chain_stats: z.object({
//     funded_txo_count: z.number(),
//     funded_txo_sum: z.number(),
//     spent_txo_count: z.number(),
//     spent_txo_sum: z.number(),
//     tx_count: z.number(),
//   }),
//   mempool_stats: z.object({
//     funded_txo_count: z.number(),
//     funded_txo_sum: z.number(),
//     spent_txo_count: z.number(),
//     spent_txo_sum: z.number(),
//     tx_count: z.number(),
//   }),
// });

export const AssetSchema = z.object({
  name: z.string(),
  ticker: z.string(),
  precision: z.number(),
});
