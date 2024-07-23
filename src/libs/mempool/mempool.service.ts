import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mempoolRecommendedFeesSchema } from './mempool.types';

@Injectable()
export class MempoolService {
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow('urls.esplora.bitcoin');
  }

  async getRecommendedFees() {
    const response = await this.get(`v1/fees/recommended`);

    return mempoolRecommendedFeesSchema.parse(response);
  }

  async get(endpoint: string) {
    const res = await fetch(`${this.baseUrl}${endpoint}`);

    return res.json();
  }
}
