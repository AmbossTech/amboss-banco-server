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

@Injectable()
export class SideShiftRestService {
  private baseUrl: string;
  private secret: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.getOrThrow('urls.sideshift.url');
    this.secret = this.config.getOrThrow('urls.sideshift.secret');
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
      body: JSON.stringify(body),
      headers: {
        'x-sideshift-secret': this.secret,
        'x-user-ip': '82.72.157.189',
        'content-type': 'application/json',
      },
    });
    const json = await response.json();
    const parsed = responseObj.safeParse(json);
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }
    return parsed.data as T;
  }
}
