type BackupMailProps = {
  date: string;
  walletName: string;
  passwordHint: string;
  recoverLink: string;
  encryptedMnemonic: string;
};

type BackupMailPassChangeProps = {
  date: string;
  walletName: string;
  newPasswordHint: string;
  recoverLink: string;
};

export const BackupMail = (props: BackupMailProps) =>
  [
    'Hi,',
    `You just created a new wallet ('${props.walletName}') on ${props.date}, with a password hint: '${props.passwordHint}'`,
    `<b>In order to recover your wallet, you need your encrypted mnemonic, which is:</b>`,
    `<b>${props.encryptedMnemonic}</b>`,
    `<b>Using your email and password and the encrypted mnemonic you can recover your seed phrase using this link: ${props.recoverLink}</b>.`,
    `Best,`,
    `The BancoLibre Team`,
  ].join('<br /><br />');

export const BackupMailPassChange = (props: BackupMailPassChangeProps) =>
  [
    'Hi,',
    `You just changed your password for a wallet ('${props.walletName}') on ${props.date}, with an updated password hint: '${props.newPasswordHint}'`,
    `<b>In order to recover your wallet, you need your encrypted mnemonic, which is sent in a previous email.</b>`,
    `<b>Using your email and password and the encrypted mnemonic you can recover your seed phrase using this link: ${props.recoverLink}</b>.`,
    `Best,`,
    `The BancoLibre Team`,
  ].join('<br /><br />');
