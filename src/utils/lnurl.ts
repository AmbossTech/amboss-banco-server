export const lightningAddressToUrl = (address: string) => {
  const [user, domain] = address.split('@');

  const protocol = domain.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${domain}/.well-known/lnurlp/${user}`;
};

export const lightningAddressToPubkeyUrl = (address: string) => {
  const [user, domain] = address.split('@');

  const protocol = domain.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${domain}/.well-known/lnurlpubkey/${user}`;
};

export const lightningAddressToMessageUrl = (address: string) => {
  const [user, domain] = address.split('@');

  const protocol = domain.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${domain}/message/${user}`;
};
