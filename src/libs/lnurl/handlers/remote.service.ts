import { Injectable } from '@nestjs/common';
import {
  CallbackRemoteParams,
  LightningAddressPubkeyResponseSchema,
} from 'src/api/lnurl/lnurl.types';
import { CustomLogger, Logger } from 'src/libs/logging';
import {
  lightningAddressToPubkeyUrl,
  lightningAddressToUrl,
} from 'src/utils/lnurl';
import { fetch } from 'undici';

import {
  LnUrlInfoSchema,
  LnUrlInfoSchemaType,
  LnUrlResponseSchemaType,
  LnUrlResultSchema,
} from '../lnurl.types';

@Injectable()
export class LnUrlRemoteService {
  constructor(@Logger('LnUrlRemoteService') private logger: CustomLogger) {}

  async getChainResponse({
    callbackUrl,
    amount,
    network,
    currency,
  }: {
    callbackUrl: string;
    amount: number;
    currency: string;
    network: string;
  }): Promise<LnUrlResponseSchemaType> {
    return this.getResponse({
      callbackUrl,
      amount: amount + '',
      currency,
      network,
    });
  }

  async getInvoiceResponse({
    callbackUrl,
    amount,
  }: {
    callbackUrl: string;
    amount: number;
  }): Promise<LnUrlResponseSchemaType> {
    return this.getResponse({
      callbackUrl,
      amount: amount + '',
      currency: undefined,
      network: undefined,
    });
  }

  async getResponse({
    callbackUrl,
    amount,
    currency,
    network,
  }: CallbackRemoteParams): Promise<LnUrlResponseSchemaType> {
    if (!amount) {
      throw new Error('No amount provided');
    }

    const url = new URL(callbackUrl);

    url.searchParams.set('amount', amount + '');

    if (currency) url.searchParams.set('currency', currency + '');
    if (network) url.searchParams.set('network', network + '');

    const urlString = url.toString();

    this.logger.debug('Getting address response', { url: urlString });

    const info = await fetch(urlString);
    const data = await info.json();

    return LnUrlResultSchema.parse(data);
  }

  async getInfo(money_address: string): Promise<LnUrlInfoSchemaType> {
    const url = lightningAddressToUrl(money_address);

    const fetchInfo = await fetch(url);

    const data = await fetchInfo.json();

    const parsed = LnUrlInfoSchema.parse(data);

    return parsed;
  }

  async getPubkey(money_address: string) {
    try {
      const rawInfo = await fetch(lightningAddressToPubkeyUrl(money_address));

      const info = await rawInfo.json();

      const parsed =
        LightningAddressPubkeyResponseSchema.passthrough().safeParse(info);

      if (!parsed.success) return null;

      return parsed.data.encryptionPubKey;
    } catch (error) {
      return null;
    }
  }
}
