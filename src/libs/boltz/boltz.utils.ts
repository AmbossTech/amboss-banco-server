import { wallet_account_swap } from '@prisma/client';
import { crypto } from 'bitcoinjs-lib';
import { decode, PaymentRequestObject, RoutingInfo, TagsObject } from 'bolt11';
import { ECPairFactory } from 'ecpair';
import { BoltzSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';
import * as ecc from 'tiny-secp256k1';

import { BoltzMagicRouteHintType } from './boltz.types';

const ECPair = ECPairFactory(ecc);

const MAGIC_ROUTING_HINT = '0846c900051c0000';
const LBTC_ASSET_HASH =
  '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d';

export const decodeBip21Url = (bip21: string) => {
  const bip21Decoded = new URL(bip21);
  const bip21Address = bip21Decoded.pathname;
  const bip21Asset = bip21Decoded.searchParams.get('assetid');
  const bip21Amount = bip21Decoded.searchParams.get('amount');

  if (!bip21Amount) {
    throw 'no amount in BIP-21';
  }

  if (!bip21Asset) {
    throw 'no asset in BIP-21';
  }

  return {
    address: bip21Address,
    amount: Number(bip21Amount),
    asset: bip21Asset,
  };
};

export const findMagicRoutingHint = (invoice: string) => {
  const decoded = decode(invoice);

  const routingInfo = decoded.tags.find(
    (tag) => tag.tagName === 'routing_info',
  );
  if (routingInfo === undefined) {
    return { decoded };
  }

  const magicRoutingHint = (routingInfo.data as any[]).find(
    (hint) => hint.short_channel_id === MAGIC_ROUTING_HINT,
  );
  if (magicRoutingHint === undefined) {
    return { decoded };
  }

  return { magicRoutingHint, decoded };
};

export const checkMagicRouteHintInfo = (
  hint: RoutingInfo[0],
  bip21: BoltzMagicRouteHintType,
  decodedInvoice: PaymentRequestObject & {
    tagsObject: TagsObject;
  },
) => {
  const receiverPublicKey = ECPair.fromPublicKey(
    Buffer.from(hint.pubkey, 'hex'),
  );
  const receiverSignature = Buffer.from(bip21.signature, 'hex');

  const { address, amount, asset } = decodeBip21Url(bip21.bip21);

  const addressHash = crypto.sha256(Buffer.from(address, 'utf-8'));

  if (!receiverPublicKey.verifySchnorr(addressHash, receiverSignature)) {
    throw 'invalid address signature';
  }

  if (asset !== LBTC_ASSET_HASH) {
    throw 'invalid BIP-21 asset';
  }

  // Amount in the BIP-21 is the amount the recipient will actually receive
  // The invoice amount includes service and swap onchain fees
  if (Number(amount) * 10 ** 8 > Number(decodedInvoice.satoshis)) {
    throw 'invalid BIP-21 amount';
  }

  return {
    address,
    amount,
    asset,
  };
};

export const getReceivingAmount = (swap: wallet_account_swap): number => {
  const { request, response } = swap;

  if (response.provider !== SwapProvider.BOLTZ) {
    throw new Error(`Not a Boltz swap`);
  }
  if (request.provider !== SwapProvider.BOLTZ) {
    throw new Error(`Not a Boltz swap`);
  }

  // Using 0.01 sat/vbyte
  // 1 input 2 outputs
  const liquidSweepFee = 13;

  switch (response.type) {
    case BoltzSwapType.CHAIN:
      return response.payload.claimDetails.amount - liquidSweepFee;
    case BoltzSwapType.REVERSE:
      return response.payload.onchainAmount - liquidSweepFee;
    case BoltzSwapType.SUBMARINE:
      // You cannot receive with a submarine swap, since the destination is always lightning
      throw new Error(`Unhandled incoming payment`);
  }
};
