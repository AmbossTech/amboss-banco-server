import { ConfigService } from '@nestjs/config';
import {
  SideShiftQuote,
  SideShiftQuoteInput,
  SideShiftFixedSwapInput,
  sideShiftQuoteOutput,
  SideShiftVariableSwapInput,
  sideShiftVariableSwapOutput,
  SideShiftVariableSwap,
} from './sideshift.types';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CustomLogger, Logger } from '../logging';

@Injectable()
export class SideShiftRestService {
  private baseUrl: string;
  private affiliateId: string;
  private secret: string;

  constructor(
    private config: ConfigService,
    @Logger(SideShiftRestService.name) private logger: CustomLogger,
  ) {
    this.baseUrl = this.config.getOrThrow('urls.sideshift.url');
    this.secret = this.config.getOrThrow('urls.sideshift.secret');
    this.affiliateId = this.config.getOrThrow('urls.sideshift.affiliateId');
  }
  async createFixedShift(input: SideShiftFixedSwapInput) {
    const response = await fetch(`${this.baseUrl}shifts/fixed`, {
      body: JSON.stringify(input),
    });

    return response.json();
  }

  async getQuote(input: SideShiftQuoteInput): Promise<SideShiftQuote> {
    return this.post<SideShiftQuote>(`quotes`, input, sideShiftQuoteOutput);
  }

  async createVariableSwap(
    input: SideShiftVariableSwapInput,
  ): Promise<SideShiftVariableSwap> {
    console.log({ variableInput: input });
    return this.post<SideShiftVariableSwap>(
      `shifts/variable`,
      input,
      sideShiftVariableSwapOutput,
    );
  }

  private async post<T>(
    endpoint: string,
    body: any,
    responseObj: z.ZodObject<any>,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ affiliateId: this.affiliateId, ...body }),
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
      },
    });
    const json = await response.json();

    if (json.error) {
      this.logger.error(`Sideshift API error`, {
        error: json.error,
        endpoint,
        body,
      });
      throw new Error(json.error);
    }
    const parsed = responseObj.safeParse(json);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.data as T;
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'x-sideshift-secret': this.secret,
        'content-type': 'application/json',
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
