import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLError } from 'graphql';
import { z } from 'zod';

import { CustomLogger, Logger } from '../logging';
import {
  BaseSideShiftInput,
  SideShiftFixedSwap,
  SideShiftFixedSwapInput,
  sideShiftFixedSwapOutput,
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
    this.baseUrl = this.config.getOrThrow('sideshift.url');
    this.secret = this.config.getOrThrow('sideshift.secret');
    this.affiliateId = this.config.getOrThrow('sideshift.affiliateId');
  }
  async createFixedShift(input: SideShiftFixedSwapInput, ip?: string) {
    return this.post<SideShiftFixedSwap>(
      `shifts/fixed`,
      input,
      sideShiftFixedSwapOutput,
      ip,
    );
  }

  async getQuote(
    input: SideShiftQuoteInput,
    ip?: string,
  ): Promise<SideShiftQuote> {
    return this.post<SideShiftQuote>(`quotes`, input, sideShiftQuoteOutput, ip);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
    ip?: string,
  ): Promise<SideShiftVariableSwap> {
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
    ip?: string,
  ): Promise<T> {
    if (!ip) {
      throw new GraphQLError(`Unable to use SideShift`);
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ affiliateId: this.affiliateId, ...body }),
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
        ...(!ip.includes('127.0.0.1') ? { 'x-user-ip': ip } : {}),
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
    const parsed = responseObj.safeParse(json);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.data as T;
  }

  private async get<T>(endpoint: string, ip?: string): Promise<T> {
    if (!ip) {
      throw new GraphQLError(`Unable to use SideShift`);
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
        ...(!ip.includes('127.0.0.1') ? { 'x-user-ip': ip } : {}),
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
    return json;
  }
}
