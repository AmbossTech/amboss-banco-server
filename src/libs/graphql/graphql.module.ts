import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Ipware } from '@fullerstack/nax-ipware';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';

import { ContextType } from './context.type';

const ipware = new Ipware();
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
        context: async (context: {
          req: Request;
          res: Response;
        }): Promise<ContextType> => {
          const { req, res } = context;
          const ipInfo = ipware.getClientIP(req);

          return {
            req,
            res,
            ipInfo,
          };
        },
      }),
    }),
  ],
})
export class GraphqlModule {}
