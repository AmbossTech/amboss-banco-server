import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: () => ({
        path: 'api/graphql',
        driver: ApolloDriver,
        autoSchemaFile: 'schema.gql',
        sortSchema: true,
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        status400ForVariableCoercionErrors: true,
        context: async ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
        }),
      }),
    }),
  ],
})
export class GraphqlModule {}
