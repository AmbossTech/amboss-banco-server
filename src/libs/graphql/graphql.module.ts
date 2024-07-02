import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { ContextType } from './context.type';

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
          const forwardHeader = req.headers['x-forwarded-for'];
          const remoteAddress = req.socket.remoteAddress || req.ip;
          let ip = remoteAddress || forwardHeader;
          if (!ip) {
            throw new Error(`Cannot get ip from request`);
          }
          if (typeof ip === 'object') {
            ip = ip[0];
          }

          return {
            req,
            res,
            ip,
          };
        },
      }),
    }),
  ],
})
export class GraphqlModule {}
