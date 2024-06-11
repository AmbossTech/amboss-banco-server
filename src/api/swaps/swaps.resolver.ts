import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { BoltzService } from '../../libs/boltz/boltz.service';
import { Public } from 'src/auth/auth.decorators';

@Resolver()
export class SwapsResolver {
  constructor(private boltzService: BoltzService) {}

  @Public()
  @Mutation(() => Boolean)
  async payInvoice(@Args('invoice') invoice: string) {
    await this.boltzService.createSubmarineSwap(
      invoice,
      '838bc43b-ffb5-485b-85d5-e468947e3ab8',
    );
    return true;
  }
}
