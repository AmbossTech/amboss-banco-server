import { Injectable } from '@nestjs/common';
import {
  SideShiftQuoteInput,
  SideShiftVariableSwapInput,
} from './sideshift.types';
import { SideShiftRestService } from './sideshift.rest';

@Injectable()
export class SideShiftService {
  constructor(private restService: SideShiftRestService) {}

  async getQuote(input: SideShiftQuoteInput) {
    return this.restService.getQuote(input);
  }

  async createVariableSwap(input: SideShiftVariableSwapInput) {
    return this.restService.createVariableSwap(input);
  }
}
