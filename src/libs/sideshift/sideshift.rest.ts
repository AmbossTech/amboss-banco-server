import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { CustomLogger, Logger } from '../logging';
import {
  BaseSideShiftInput,
  SideShiftFixedSwap,
  SideShiftFixedSwapInput,
  sideShiftFixedSwapOutput,
  SideShiftPermissions,
  sideShiftPermissionsOutput,
  SideShiftQuote,
  SideShiftQuoteInput,
  sideShiftQuoteOutput,
  SideShiftVariableSwap,
  SideShiftVariableSwapInput,
  sideShiftVariableSwapOutput,
} from './sideshift.types';

@Injectable()
export class SideShiftRestService {
  private baseUrl: string;
  private affiliateId: string;
  private secret: string;

  constructor(
    private config: ConfigService,
    @Logger(SideShiftRestService.name) private logger: CustomLogger,
  ) {
    this.baseUrl = this.config.get('sideshift.url') || '';
    this.secret = this.config.get('sideshift.secret') || '';
    this.affiliateId = this.config.get('sideshift.affiliateId') || '';
  }

  private isEnabled() {
    return !!this.affiliateId && !!this.baseUrl && !!this.secret;
  }

  async getPermissions(ip: string) {
    if (!this.isEnabled()) throw new Error('Swaps disabled');

    return this.get<SideShiftPermissions>(
      'permissions',
      sideShiftPermissionsOutput,
      ip,
    );
  }

  async createFixedShift(input: SideShiftFixedSwapInput, ip: string) {
    if (!this.isEnabled()) throw new Error('Swaps disabled');

    return this.post<SideShiftFixedSwap>(
      `shifts/fixed`,
      input,
      sideShiftFixedSwapOutput,
      ip,
    );
  }

  async getQuote(
    input: SideShiftQuoteInput,
    ip: string,
  ): Promise<SideShiftQuote> {
    if (!this.isEnabled()) throw new Error('Swaps disabled');

    return this.post<SideShiftQuote>(`quotes`, input, sideShiftQuoteOutput, ip);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    ip: string,
  ): Promise<SideShiftVariableSwap> {
    if (!this.isEnabled()) throw new Error('Swaps disabled');

    return this.post<SideShiftVariableSwap>(
      `shifts/variable`,
      input,
      sideShiftVariableSwapOutput,
      ip,
    );
  }

  private async post<T>(
    endpoint: string,
    body: BaseSideShiftInput,
    responseObj: z.ZodObject<any>,
    ip: string,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ affiliateId: this.affiliateId, ...body }),
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
        'x-user-ip': ip,
      },
    });
    const json = await response.json();

    if (json.error) {
      const errorMsg: string = json.error.message;
      this.logger.error(`Sideshift API error`, {
        error: errorMsg,
        endpoint,
        body,
      });
      throw new Error(errorMsg);
    }
    const parsed = responseObj.passthrough().safeParse(json);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.data as T;
  }

  private async get<T>(
    endpoint: string,
    responseObj: z.ZodObject<any>,
    ip: string,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
        'x-user-ip': ip,
      },
    });
    const json = await response.json();

    if (json.error) {
      this.logger.error(`Sideshift API error`, {
        error: json.error,
        endpoint,
      });
      throw new Error(json.error);
    }

    const parsed = responseObj.passthrough().safeParse(json);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.data as T;
  }
}
