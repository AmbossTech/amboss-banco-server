import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

import { CustomLogger, Logger } from '../logging';
import { LnUrlResultSchema } from './lnurl.types';

@Injectable()
export class LnurlService {
  constructor(@Logger('LnurlService') private logger: CustomLogger) {}

  async getAddressInvoice(callbackUrl: string, amount: number) {
    const url = new URL(callbackUrl);
    url.searchParams.set('amount', amount * 1000 + '');

    const urlString = url.toString();

    this.logger.debug('Getting address invoice', { url: urlString });

    const info = await fetch(urlString);
    const data = await info.json();

    return LnUrlResultSchema.parse(data);
  }
}
