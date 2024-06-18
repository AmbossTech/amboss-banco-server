import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger, Logger } from '../logging';
import { auto, eachSeries, forever } from 'async';
import ws from 'ws';
import { SwapsRepoService } from 'src/repo/swaps/swaps.repo';
import { SwapProvider } from 'src/repo/swaps/swaps.types';
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

  async subscribeToSwap(ids: string[]) {
    if (!this.webSocket) {
      throw new Error('Websocket connection is not active');
    }

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

                  if (!!swapIds.length) {
                    this.logger.info('Subscribing to pending swaps...', {
                      ids: swapIds,
                    });

                    this.subscribeToSwap(swapIds);
                  }
                });

                this.webSocket.on('message', async (rawMsg) => {
                  const msg = JSON.parse(rawMsg.toString('utf-8'));

                  if (msg.event !== 'update') return;

                  this.logger.debug('Boltz Websocket Message', { msg });

                  await eachSeries(
                    msg.args,
                    async (arg: { id: string; status: string }) => {
                      const swap = getPendingSwaps.find(
                        (s) => s.response.payload.id === arg.id,
                      );

                      if (!swap) {
                        throw new Error('Received message for unknown swap');
                      }

                      switch (arg.status) {
                        // "invoice.set" means Boltz is waiting for an onchain transaction to be sent
                        case 'invoice.set': {
                          this.logger.debug('Waiting for onchain transaction');
                          break;
                        }

                        // Create a partial signature to allow Boltz to do a key path spend to claim the mainchain coins
                        case 'transaction.claim.pending': {
                          await this.tcpService.handle(swap);
                          break;
                        }

                        case 'swap.expired':
                        case 'invoice.failedToPay':
                          this.logger.debug('Swap completed unsuccessfully');
                          await this.swapsRepo.markCompleted(swap.id);
                          break;

                        case 'transaction.claimed':
                          this.logger.debug('Swap successful');
                          await this.swapsRepo.markCompleted(swap.id);
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
