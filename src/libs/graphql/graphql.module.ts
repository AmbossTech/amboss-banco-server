import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { getIp } from 'src/utils/ip';

import { DataloaderModule } from '../dataloader/dataloader.module';
import { DataloaderService } from '../dataloader/dataloader.service';
import { ContextType } from './context.type';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [DataloaderModule],
      inject: [DataloaderService],
      driver: ApolloDriver,
      useFactory: (dataloaderService: DataloaderService) => ({
        path: 'api/graphql',
        driver: ApolloDriver,
        autoSchemaFile: 'schema.gql',
        sortSchema: true,
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        status400ForVariableCoercionErrors: true,
        context: async ({
          req,
          res,
        }: {
          req: Request;
          res: Response;
        }): Promise<ContextType> => {
          return {
            req,
            res,
            ip: getIp(req),
            loaders: dataloaderService.createLoaders(),
          };
        },
      }),
    }),
  ],
})
export class GraphqlModule {}
