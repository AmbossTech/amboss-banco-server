import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auto, eachSeries, forever } from 'async';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { BoltzSwapType, SwapProvider } from 'src/repo/swaps/swaps.types';
import ws from 'ws';

import { CustomLogger, Logger } from '../logging';
import { BoltzSubscriptionAutoType } from './boltz.types';
import { TransactionClaimPendingService } from './handlers/transactionClaimPending';

const RESTART_TIMEOUT = 1000 * 30;

@Injectable()
export class BoltzWsService implements OnApplicationBootstrap {
  webSocket: ws;
  apiUrl: string;
  retryCount = 0;

  constructor(
    private configService: ConfigService,
    private swapsRepo: SwapsRepoService,
    private tcpService: TransactionClaimPendingService,
    @Logger('BoltzService') private logger: CustomLogger,
  ) {
    this.apiUrl = configService.getOrThrow('urls.boltz');
  }

  async onApplicationBootstrap() {
    const enableWebsocket = this.configService.get<boolean>(
      'server.boltz.enableWebsocket',
    );

    if (!enableWebsocket) return;

    this.startSubscription();
  }

  subscribeToSwap(ids: string[]) {
    if (!this.webSocket) {
      this.logger.error('Websocket connection is not active');
      return;
    }

    this.logger.info('Subscribing to new Boltz swaps', { ids });

    this.webSocket.send(
      JSON.stringify({
        op: 'subscribe',
        channel: 'swap.update',
        args: ids,
      }),
    );
  }

  async startSubscription() {
    this.logger.debug('Starting Boltz websocket...');

    return forever(
      (next) => {
        return auto<BoltzSubscriptionAutoType>(
          {
            getPendingSwaps: async () => {
              return this.swapsRepo.getActiveBoltzSwaps();
            },

            websocket: [
              'getPendingSwaps',
              ({ getPendingSwaps }, cbk) => {
                const webSocketUrl = `${this.apiUrl.replace('https://', 'wss://')}ws`;

                this.webSocket = new ws(webSocketUrl);

                this.webSocket.on('open', () => {
                  this.logger.info('Connected to Boltz websocket');

                  if (!getPendingSwaps.length) return;

                  const swapIds = getPendingSwaps
                    .map((s) => {
                      if (s.response.provider !== SwapProvider.BOLTZ) {
                        return '';
                      }
                      return s.response.payload.id;
                    })
                    .filter(Boolean);

                  if (!swapIds.length) return;

                  this.subscribeToSwap(swapIds);
                });

                this.webSocket.on('message', async (rawMsg) => {
                  const msg = JSON.parse(rawMsg.toString('utf-8'));

                  if (msg.event !== 'update') return;

                  this.logger.debug('Boltz Websocket Message', { msg });

                  await eachSeries(
                    msg.args,
                    async (arg: { id: string; status: string }) => {
                      const swap = await this.swapsRepo.getBoltzSwapByBoltzId(
                        arg.id,
                      );

                      if (!swap) {
                        throw new Error('Received message for unknown swap');
                      }

                      if (
                        swap.request.provider !== SwapProvider.BOLTZ ||
                        swap.response.provider !== SwapProvider.BOLTZ
                      ) {
                        return;
                      }

                      switch (arg.status) {
                        // "invoice.set" means Boltz is waiting for an onchain transaction to be sent
                        case 'invoice.set': {
                          this.logger.debug('Waiting for onchain transaction');
                          break;
                        }

                        // Create a partial signature to allow Boltz to do a key path spend to claim the mainchain coins
                        case 'transaction.claim.pending': {
                          await this.tcpService.handleSubmarine(swap);
                          break;
                        }

                        case 'swap.expired':
                        case 'invoice.expired':
                        case 'invoice.failedToPay':
                        case 'transaction.failed':
                        case 'transaction.refunded':
                        case 'transaction.lockupFailed':
                          this.logger.debug('Swap completed unsuccessfully');
                          await this.swapsRepo.markCompleted(swap.id);
                          break;

                        case 'invoice.settled':
                        case 'transaction.claimed':
                          this.logger.debug('Swap successful');
                          await this.swapsRepo.markCompleted(swap.id);
                          break;

                        case 'transaction.mempool':
                        case 'transaction.server.mempool':
                        case 'transaction.server.confirmed':
                        case 'transaction.confirmed':
                          this.logger.debug('Creating claim transaction', {
                            status: arg.status,
                          });
                          if (
                            swap.request.type == BoltzSwapType.REVERSE &&
                            swap.request.payload.claimCovenant
                          ) {
                            this.logger.debug('Ignoring covenant');
                            return;
                          }
                          if (swap.request.type == BoltzSwapType.SUBMARINE) {
                            await this.tcpService.handleSubmarine(swap);
                            break;
                          }

                          if (swap.request.type == BoltzSwapType.REVERSE) {
                            await this.tcpService.handleReverse(swap, arg);
                            break;
                          }

                          if (swap.request.type == BoltzSwapType.CHAIN) {
                            await this.tcpService.handleChain(swap, arg);
                            break;
                          }
                          break;

                        default:
                          this.logger.debug('Unhandled message', { msg });
                          break;
                      }
                    },
                  );
                });

                this.webSocket.on('error', () => {
                  this.webSocket.close();
                  this.logger.error('Error in Boltz websocket');

                  cbk(Error('Error in Boltz websocket'));
                });
              },
            ],
          },

          async (err, results) => {
            if (err) {
              this.logger.error('Websocket Handler Error', err);
            } else {
              this.logger.error('Websocket Handler Result', results);
            }

            this.retryCount = this.retryCount + 1;

            if (this.retryCount >= 4) {
              next(Error('Max retries attempted'));
              return;
            }

            const retryTime = RESTART_TIMEOUT * this.retryCount;

            setTimeout(async () => {
              this.logger.warn('Restarting...');
              next();
            }, retryTime);
          },
        );
      },
      async (err) => {
        this.logger.error('Boltz Websocket Connection Failed', { err });
      },
    );
  }
}
