import { Query, Resolver } from '@nestjs/graphql';
import { forEachSeries } from 'async';
import { Public } from 'src/auth/auth.decorators';
import { CryptoService } from 'src/libs/crypto/crypto.service';
import { PrismaService } from 'src/libs/prisma/prisma.service';
import { getSHA256Hash } from 'src/utils/crypto/crypto';

@Resolver()
export class GeneralResolvers {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  @Public()
  @Query(() => String)
  async hello() {
    const accounts = await this.prisma.wallet_account.findMany();

    console.log(accounts);

    await forEachSeries(accounts, async (a) => {
      const descriptor_hash = getSHA256Hash(a.details.descriptor);
      const local_protected_descriptor = this.crypto.encryptString(
        a.details.descriptor,
      );

      const details = {
        ...a.details,
        descriptor_hash,
        local_protected_descriptor,
      };

      console.log(details);

      await this.prisma.wallet_account.update({
        where: { id: a.id },
        data: { details },
      });
    });

    return 'Hello!';
  }
}
