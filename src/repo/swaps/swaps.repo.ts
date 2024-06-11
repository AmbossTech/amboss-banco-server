import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import {
  AccountSwapRequestType,
  AccountSwapResponseType,
  SwapProvider,
} from './swaps.types';

@Injectable()
export class SwapsRepoService {
  constructor(private prisma: PrismaService) {}

  async getReverseSwapByInvoice(invoice: string) {
    return this.prisma.wallet_account_swap.findFirst({
      where: {
        swap_completed: false,
        request: {
          path: ['payload', 'invoice'],
          equals: invoice,
        },
      },
    });
  }

  async markCompleted(id: string) {
    return this.prisma.wallet_account_swap.update({
      where: { id },
      data: {
        swap_completed: true,
      },
    });
  }

  async getActiveBoltzSwaps() {
    return this.prisma.wallet_account_swap.findMany({
      where: {
        swap_completed: false,
        request: {
          path: ['provider'],
          equals: SwapProvider.BOLTZ,
        },
      },
    });
  }

  async createSwap(
    wallet_account_id: string,
    request: AccountSwapRequestType,
    response: AccountSwapResponseType,
  ) {
    return this.prisma.wallet_account_swap.create({
      data: {
        wallet_account_id,
        request,
        response,
      },
    });
  }
}
