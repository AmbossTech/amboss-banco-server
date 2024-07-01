import { Injectable } from '@nestjs/common';
import { wallet_account_swap } from '@prisma/client';
import { PrismaService } from 'src/libs/prisma/prisma.service';

import {
  AccountSwapRequestType,
  AccountSwapResponseType,
  SwapProvider,
} from './swaps.types';

@Injectable()
export class SwapsRepoService {
  constructor(private prisma: PrismaService) {}

  async getWalletSwaps(id: string): Promise<wallet_account_swap[]> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      select: {
        wallet_account: {
          select: {
            wallet_account_swap: true,
          },
        },
      },
    });

    if (!wallet?.wallet_account.length) return [];

    const swaps: wallet_account_swap[] = [];

    wallet.wallet_account.forEach((a) => {
      a.wallet_account_swap.forEach((s) => {
        swaps.push(s);
      });
    });

    return swaps;
  }

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
