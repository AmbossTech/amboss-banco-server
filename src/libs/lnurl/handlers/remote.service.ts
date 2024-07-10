import { Injectable } from '@nestjs/common';
import { LightningAddressPubkeyResponseSchema } from 'src/api/lnurl/lnurl.types';
import {
  lightningAddressToPubkeyUrl,
  lightningAddressToUrl,
} from 'src/utils/lnurl';
import { fetch } from 'undici';

import { LnUrlInfoSchema, LnUrlInfoSchemaType } from '../lnurl.types';

@Injectable()
export class LnUrlRemoteService {
  async getInfo(money_address: string): Promise<LnUrlInfoSchemaType> {
    const url = lightningAddressToUrl(money_address);

    const fetchInfo = await fetch(url);

    const data = fetchInfo.json();

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
