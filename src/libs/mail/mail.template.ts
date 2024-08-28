type BackupMailProps = {
  backup: WalletBackup;
};

type BackupMailPassChangeProps = {
  date: string;
  walletName: string;
  newPasswordHint?: string;
  recoverLink: string;
  encryptedMnemonic: string;
};

type WalletBackup = {
  ['Wallet Name']: string;
  ['Date Created']: string;
  ['Password Hint']?: string;
  ['Recovery Link']: string;
  ['Encrypted Mnemonic']: string;
};

type MailTemplate = {
  subject: string;
  html: string;
};

const generateList = (items: Record<string, string>) => {
  const list = Object.entries(items).reduce((p, [key, value]) => {
    if (!value) return p;
    return p + `<li><b>${key}</b>: ${value}</li>`;
  }, '');

  return '<ul>' + list + '</ul>';
};

export const BackupMail = (props: BackupMailProps): MailTemplate => {
  const subject = `Welcome to BancoLibre.com - Your ${props.backup['Wallet Name']} Backup`;
  const html = [
    'Hi,',
    `Congratulations! You’ve just created a new wallet for your account. You can now send and receive money across borders to anyone, anywhere. With BancoLibre, we’ve made it simple and secure for you and your family to receive money, even if they aren’t familiar with tech or cryptocurrencies.`,
    `In case you ever need to recover your wallet, here’s the information you’ll need, along with your super secret password:`,
    `${generateList(props.backup)}`,
    `Keep this email safe, and if you have any questions, we’re here to help.`,
    `Best, <br />The BancoLibre Team`,
  ].join('<br /><br />');

  return {
    html,
    subject,
  };
};

export const BackupMailPassChange = (
  props: BackupMailPassChangeProps,
): MailTemplate => {
  const subject = `BancoLibre Password Changed for ${props.walletName}`;
  const passChanged = props.newPasswordHint
    ? [
        `We’ve updated your password hint to help you remember it:`,
        `<b>New Password Hint:</b> ${props.newPasswordHint}`,
      ]
    : [];
  const html = [
    'Hi,',
    `Your wallet password for ${props.walletName} was successfully changed on ${props.date}.`,
    ...passChanged,
    `Just a quick reminder—if you ever need to recover your wallet, you’ll need your encrypted mnemonic:`,
    `<b>Encrypted Mnemonic:</b> ${props.encryptedMnemonic}`,
    `With your email, password, and encrypted mnemonic, you can recover your seed phrase using the link below:`,
    `<b>Recovery Link:</b> ${props.recoverLink}`,
    `Keep this email safe, and if you have any questions, we’re here to help.`,
    `Best, <br />The BancoLibre Team`,
  ].join('<br /><br />');

  return { html, subject };
};
