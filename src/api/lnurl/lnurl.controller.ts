import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { auto } from 'async';
import { Public } from 'src/auth/auth.decorators';
import { BoltzRestApi } from 'src/libs/boltz/boltz.rest';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';
import { WalletAccountType } from 'src/repo/wallet/wallet.types';
import { GetLnurlAutoType, MessageBodySchema } from './lnurl.types';
import { ConfigService } from '@nestjs/config';
import { LnurlService } from 'src/libs/lnurl/lnurl.service';
import { ContactRepoService } from 'src/repo/contact/contact.repo';

@Controller('message')
export class MessageController {
  constructor(
    private config: ConfigService,
    private boltzApi: BoltzRestApi,
    private walletRepo: WalletRepoService,
    private lnurlService: LnurlService,
    private contactRepo: ContactRepoService,
  ) {}

  @Public()
  @Post(':account')
  @Header('Content-Type', 'application/json')
  async lnurlPost(
    @Body() body: any,
    @Param() params: { account: string },
  ): Promise<{ account: string }> {
    console.log(body);

    const parsed = MessageBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpException('Invalid request body', HttpStatus.BAD_REQUEST);
    }

    const wallet = await this.walletRepo.getWalletByLnAddress(params.account);

    if (!wallet) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }

    await this.contactRepo.saveContactMessage({
      lightning_address_user: params.account,
      contact_lightning_address: parsed.data.payerData.identifier,
      protected_message: parsed.data.protected_message,
      contact_is_sender: true,
    });

    return { account: params.account };
  }
}

@Controller('lnurlp')
export class LnUrlController {
  constructor(
    private config: ConfigService,
    private boltzApi: BoltzRestApi,
    private walletRepo: WalletRepoService,
  ) {}

  @Public()
  @Get(':account')
  @Header('Content-Type', 'application/json')
  async lnurlGet(
    @Param() params: { account: string },
    @Query() query: { amount: string | undefined },
  ): Promise<string> {
    if (!query.amount) {
      return JSON.stringify({ status: 'ERROR', reason: 'No amount provided' });
    }

    const amount = Number(query.amount);

    if (isNaN(amount)) {
      return JSON.stringify({ status: 'ERROR', reason: 'No amount provided' });
    }

    const wallet = await this.walletRepo.getWalletByLnAddress(params.account);

    if (!wallet) {
      return JSON.stringify({ status: 'ERROR', reason: 'Account not found' });
    }

    const boltzInfo = await this.boltzApi.getReverseSwapInfo();

    const { maximal, minimal } = boltzInfo.BTC['L-BTC'].limits;

    if (maximal < amount) {
      return JSON.stringify({
        status: 'ERROR',
        reason: `Amount ${amount} greater than maximum of ${maximal}`,
      });
    }

    if (minimal > amount) {
      return JSON.stringify({
        status: 'ERROR',
        reason: `Amount ${amount} smaller than minimum of ${minimal}`,
      });
    }

    return JSON.stringify({ pr: 'TODO: GET INVOICE FROM BOLTZ', routes: [] });
  }

  @Public()
  @Post(':account')
  @Header('Content-Type', 'application/json')
  async lnurlPost(
    @Body() body: any,
    @Param() params: { account: string },
  ): Promise<string> {
    console.log(body);

    return params.account;
  }
}

@Controller('.well-known')
export class WellKnownController {
  constructor(
    private config: ConfigService,
    private boltzApi: BoltzRestApi,
    private walletRepo: WalletRepoService,
  ) {}

  @Public()
  @Get('lnurlpubkey/:account')
  @Header('Content-Type', 'application/json')
  async getPubkey(@Param() params: { account: string }): Promise<string> {
    const wallet = await this.walletRepo.getWalletByLnAddress(params.account);

    if (!wallet) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }

    return JSON.stringify({
      encryptionPubKey: wallet.secp256k1_key_pair.public_key,
    });
  }

  @Public()
  @Get('lnurlp/:account')
  @Header('Content-Type', 'application/json')
  async getLnurl(@Param() params: { account: string }): Promise<string> {
    return await auto<GetLnurlAutoType>({
      getBoltzInfo: async () => {
        return this.boltzApi.getReverseSwapInfo();
      },

      getAccounts: async () => {
        const wallet = await this.walletRepo.getWalletByLnAddress(
          params.account,
        );

        if (!wallet?.wallet.wallet_account.length) {
          throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
        }

        return wallet.wallet.wallet_account;
      },

      getLiquidAccounts: [
        'getAccounts',
        async ({ getAccounts }: Pick<GetLnurlAutoType, 'getAccounts'>) => {
          const hasLiquidAccount = getAccounts.some(
            (a) => a.details.type === WalletAccountType.LIQUID,
          );

          if (!hasLiquidAccount) return [];

          const currencies = [];
          currencies.push({
            code: 'BTC',
            name: 'Bitcoin',
            network: 'LIQUID',
            symbol: '₿',
            is_native: true,
            // multiplier: 1000,
            // decimals: 8,
            // convertible: {
            //   min: 1,
            //   max: 100000000,
            // },
          });

          currencies.push({
            code: 'USDT',
            name: 'Tether',
            network: 'LIQUID',
            symbol: '$',
            is_native: true,
            // multiplier: 1000,
            // decimals: 8,
            // convertible: {
            //   min: 1,
            //   max: 100000000,
            // },
          });

          return currencies;
        },
      ],

      buildResponse: [
        'getBoltzInfo',
        'getLiquidAccounts',
        async ({
          getBoltzInfo,
          getLiquidAccounts,
        }: Pick<GetLnurlAutoType, 'getBoltzInfo' | 'getLiquidAccounts'>) => {
          return JSON.stringify({
            callback: `http://${this.config.getOrThrow('server.domain')}/lnurlp/${params.account}`,
            minSendable: getBoltzInfo.BTC['L-BTC'].limits.minimal,
            maxSendable: getBoltzInfo.BTC['L-BTC'].limits.maximal,
            metadata: JSON.stringify([
              ['text/plain', `Payment to ${params.account}`],
            ]),
            payerData: {
              // name: { mandatory: false },
              // pubkey: { mandatory: false },
              identifier: { mandatory: false },
            },
            currencies: getLiquidAccounts,
            tag: 'payRequest',
          });
        },
      ],
    }).then((result) => result.buildResponse);
  }
}
