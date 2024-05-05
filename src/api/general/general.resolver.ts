import { Query, Resolver } from '@nestjs/graphql';
import { Public } from 'src/auth/auth.decorators';

@Resolver()
export class GeneralResolvers {
  @Public()
  @Query(() => String)
  async hello() {
    return 'Hello!';
  }
}
