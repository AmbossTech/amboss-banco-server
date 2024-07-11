import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { CustomLogger, Logger } from '../logging';
import { AmbossReferralCode, ambossReferralCodeSchema } from './amboss.types';

@Injectable()
export class AmbossService {
  private baseUrl?: string;
  private secret?: string;

  constructor(
    private config: ConfigService,
    @Logger(AmbossService.name) private logger: CustomLogger,
  ) {
    this.baseUrl = this.config.getOrThrow('amboss.url');
    this.secret = this.config.getOrThrow('amboss.secret');
  }

  async getReferralCodes(email: string): Promise<AmbossReferralCode[]> {
    const response = await this.get(`referral?email=${email}`);

    const parsed = z.array(ambossReferralCodeSchema).safeParse(response);
    if (parsed.error) {
      this.logger.error(`Invalid response for referral codes`, {
        response,
        email,
      });
      return [];
    }

    return parsed.data;
  }

  private async get(endpoint: string) {
    if (!this.baseUrl || !this.secret) {
      throw new Error(`Amboss service is not available`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { 'amboss-banco-secret': this.secret },
    });

    return response.json();
  }

  private async post(endpoint: string, body: any) {
    if (!this.baseUrl || !this.secret) {
      throw new Error(`Amboss service is not available`);
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      headers: {
        'content-type': 'application/json',
        'amboss-banco-secret': this.secret,
      },
      body: JSON.stringify(body),
    });

    return response.json();
  }
}
