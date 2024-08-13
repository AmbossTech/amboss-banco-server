import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Public } from 'src/auth/auth.decorators';
import { LnUrlLocalService } from 'src/libs/lnurl/handlers/local.service';
import { WalletRepoService } from 'src/repo/wallet/wallet.repo';

import { CallbackLocalParams } from './lnurl.types';

// @Controller('message')
// export class MessageController {
//   constructor(
//     private config: ConfigService,
//     private boltzApi: BoltzRestApi,
//     private walletRepo: WalletRepoService,
//     private lnurlService: LnurlService,
//     private contactRepo: ContactRepoService,
//   ) {}

//   @Public()
//   @Post(':account')
//   @Header('Content-Type', 'application/json')
//   async lnurlPost(
//     @Body() body: any,
//     @Param() params: { account: string },
//   ): Promise<{ account: string }> {
//     console.log(body);

//     const parsed = MessageBodySchema.safeParse(body);

//     if (!parsed.success) {
//       throw new HttpException('Invalid request body', HttpStatus.BAD_REQUEST);
//     }

//     const wallet = await this.walletRepo.getWalletByLnAddress(params.account);

//     if (!wallet) {
//       throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
//     }

//     await this.contactRepo.saveContactMessage({
//       money_address_user: params.account,
//       contact_money_address: parsed.data.payerData.identifier,
//       payload_string: parsed.data.payload,
//       contact_is_sender: true,
//     });

//     return { account: params.account };
//   }
// }

@Controller('lnurlp')
export class LnUrlController {
  constructor(private localLnUrl: LnUrlLocalService) {}

  @Public()
  @Get(':account')
  @Header('Content-Type', 'application/json')
  async lnurlGet(
    @Param() params: { account: string },
    @Query()
    query: Omit<CallbackLocalParams, 'account'>,
  ): Promise<string> {
    const response = await this.localLnUrl.getResponse({
      account: params.account,
      ...query,
    });
    return JSON.stringify(response);
  }

  // @Public()
  // @Post(':account')
  // @Header('Content-Type', 'application/json')
  // async lnurlPost(
  //   @Body() body: any,
  //   @Param() params: { account: string },
  // ): Promise<string> {
  //   console.log(body);

  //   return params.account;
  // }
}

@Controller('.well-known')
export class WellKnownController {
  constructor(
    private localLnUrl: LnUrlLocalService,
    private walletRepo: WalletRepoService,
  ) {}

  @Public()
  @Get('lnurlpubkey/:account')
  @Header('Content-Type', 'application/json')
  async getPubkey(@Param() params: { account: string }): Promise<string> {
    if (!params.account) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'No account provided',
      });
    }

    const account = params.account.toLowerCase();

    const wallet = await this.walletRepo.getWalletByLnAddress(account);

    if (!wallet) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'Account not found',
      });
    }

    return JSON.stringify({
      encryptionPubKey: wallet.secp256k1_key_pair.public_key,
    });
  }

  @Public()
  @Get('lnurlp/:account')
  @Header('Content-Type', 'application/json')
  async getLnurl(@Param() params: { account: string }): Promise<string> {
    if (!params.account) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'No account provided',
      });
    }

    const account = params.account.toLowerCase();

    const wallet = await this.walletRepo.getWalletByLnAddress(account);

    if (!wallet) {
      return JSON.stringify({
        status: 'ERROR',
        reason: 'Account not found',
      });
    }

    const info = await this.localLnUrl.getInfo(account);

    return JSON.stringify(info);
  }
}
