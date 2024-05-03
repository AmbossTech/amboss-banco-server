import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class GeneralResolvers {
  @Query(() => String)
  async hello() {
    return 'Hello!';
  }
}
