import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { swapReverseInfoSchema } from './boltz.types';

@Injectable()
export class BoltzRestApi {
  apiUrl;

  constructor(private configService: ConfigService) {
    this.apiUrl = configService.getOrThrow('urls.boltz');
  }

  async getReverseSwapInfo() {
    const result = await fetch(`${this.apiUrl}swap/reverse`);

    const body = await result.json();

    return swapReverseInfoSchema.parse(body);
  }
}
