import { OnchainAddressType } from 'src/api/wallet/wallet.types';

import { encodeBip21 } from './bitcoin.utils';

describe('encodeBip21', () => {
  it('should generate bitcoin bip21 without amount', () => {
    const bip21 = encodeBip21({
      symbol: OnchainAddressType.BTC,
      address: '1PuJjnF476W3zXfVYmJfGnouzFDAXakkL4',
    });

    expect(bip21).toBe(`bitcoin:1PuJjnF476W3zXfVYmJfGnouzFDAXakkL4`);
  });
  it('should generate bitcoin bip21', () => {
    const bip21 = encodeBip21({
      symbol: OnchainAddressType.BTC,
      address: '1PuJjnF476W3zXfVYmJfGnouzFDAXakkL4',
      sats: 1_000_000,
    });

    expect(bip21).toBe(
      `bitcoin:1PuJjnF476W3zXfVYmJfGnouzFDAXakkL4?amount=0.01`,
    );
  });
  it('should generate liquid bip21', () => {
    const bip21 = encodeBip21({
      symbol: OnchainAddressType.L_BTC,
      address: 'QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg',
      sats: 1_000_000,
    });

    expect(bip21).toBe(
      `liquidbitcoin:QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg?amount=0.01`,
    );
  });
  it('should generate liquid bip21 with asset', () => {
    const bip21 = encodeBip21({
      symbol: OnchainAddressType.L_BTC,
      address: 'QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg',
      sats: 1_000_000,
      assetId:
        '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
    });

    expect(bip21).toBe(
      `liquidbitcoin:QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg?amount=0.01&assetid=6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d`,
    );
  });
  it('should generate liquid bip21 with asset without amount', () => {
    const bip21 = encodeBip21({
      symbol: OnchainAddressType.L_BTC,
      address: 'QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg',
      assetId:
        '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
    });

    expect(bip21).toBe(
      `liquidbitcoin:QLFdUboUPJnUzvsXKu83hUtrQ1DuxyggRg?assetid=6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d`,
    );
  });
});
