type BackupMailProps = {
  details: {
    ['Date']: string;
    ['Wallet Name']: string;
    ['Encrypted Mnemonic']: string;
    ['Password Hint']: string;
    ['Recover Link']: string;
  };
};

const generateList = (list: Record<string, string>) => {
  const htmlList = Object.entries(list).reduce((l, [key, value]) => {
    return l + `<li style='padding: 4px'> ${key}: ${value} </li>`;
  }, ``);

  return `<ul> ${htmlList} </ul>`;
};

export const BackupMail = ({ details }: BackupMailProps) => `
  Hi,
  <br /><br />
  You just created a new wallet, here is the needed info to recover your wallet:
  <br />
  ${generateList(details)}

  Best,
  <br /><br />
  The BancoLibre Team
`;
