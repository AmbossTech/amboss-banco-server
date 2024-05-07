import { Network, Wollet, WolletDescriptor } from 'lwk_wasm';

export const getWalletFromDescriptor = (descriptor: string): Wollet => {
  const network = Network.mainnet();
  const wolletDescriptor = new WolletDescriptor(descriptor);

  return new Wollet(network, wolletDescriptor);
};
