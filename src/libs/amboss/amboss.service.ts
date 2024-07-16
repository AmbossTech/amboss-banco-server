import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { CustomLogger, Logger } from '../logging';
import {
  AmbossCanSignup,
  ambossCanSignupSchema,
  AmbossReferralCode,
  AmbossReferralCodeAvailable,
  ambossReferralCodeAvailableSchema,
  ambossReferralCodeSchema,
  AmbossUseReferralCode,
  ambossUseReferralCodeSchema,
} from './amboss.types';

@Injectable()
export class AmbossService {
  private baseUrl?: string;
  private secret?: string;
  private hasAmbossAccess: boolean;

  constructor(
    private config: ConfigService,
    @Logger(AmbossService.name) private logger: CustomLogger,
  ) {
    this.baseUrl = this.config.get('amboss.url');
    this.secret = this.config.get('amboss.secret');
    this.hasAmbossAccess = !!this.baseUrl && !!this.secret;
  }

  async getReferralCodes(email: string): Promise<AmbossReferralCode[]> {
    if (!this.hasAmbossAccess) return [];

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

  async getReferralCodeAvailable(
    code: string,
  ): Promise<AmbossReferralCodeAvailable> {
    if (!this.hasAmbossAccess) return { available: false };

    const response = await this.get(`referral/${code}/available`);

    const parsed = ambossReferralCodeAvailableSchema.safeParse(response);

    if (parsed.error) {
      this.logger.error(`Invalid response for referral code available`, {
        response,
        code,
      });
      return { available: false };
    }

    return parsed.data;
  }

  async useRefferalCode(
    code: string,
    email: string,
  ): Promise<AmbossUseReferralCode> {
    if (!this.hasAmbossAccess) return { success: false };

    const response = await this.post(`referral/${code}/use?email=${email}`);

    const parsed = ambossUseReferralCodeSchema.safeParse(response);

    if (parsed.error) {
      this.logger.error(`Invalid response for use referral code`, {
        response,
        code,
      });
      return { success: false };
    }

    return parsed.data;
  }

  async canSignup(
    email: string,
    referralCode?: string,
  ): Promise<AmbossCanSignup> {
    if (!this.hasAmbossAccess) return { can_signup: false };

    const referralCodeParam = referralCode
      ? `&referral-code=${referralCode}`
      : ``;
    const response = await this.get(
      `account/can-signup?email=${email}${referralCodeParam}`,
    );

    const parsed = ambossCanSignupSchema.safeParse(response);

    if (parsed.error) {
      this.logger.error(`Invalid response for can signup`, {
        response,
        email,
      });
      return { can_signup: false };
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

  private async post(endpoint: string, body?: any) {
    if (!this.baseUrl || !this.secret) {
      throw new Error(`Amboss service is not available`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'amboss-banco-secret': this.secret,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }
}
