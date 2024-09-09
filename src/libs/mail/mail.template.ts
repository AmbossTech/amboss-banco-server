type BackupMailProps = {
  walletName: string;
  recoverLink: string;
};

type BackupMailPassChangeProps = {
  walletName: string;
  newPasswordHint: string | null;
  recoverLink: string;
};

type MailTemplate = {
  subject: string;
  html: string;
};

export const getFilename = (walletName: string, date: Date): string =>
  `${walletName.replace(' ', '_')}_recovery_${date.getTime()}.json`;

export const BackupMail = ({
  walletName,
  recoverLink,
}: BackupMailProps): MailTemplate => {
  const subject = `Wallet Backup - Your ${walletName} Recovery Backup - BancoLibre`;

  const html = [
    'Hi,',
    `Congratulations! You've just created a new wallet for your account. You can now send and receive money across borders to anyone, anywhere.`,
    `With BancoLibre, we've made it simple and secure for you and your family to receive money, even if they aren't familiar with tech or cryptocurrencies.`,
    `In case you ever need to recover your wallet, you will find a recovery file attached in this email. With this information and your super secret password, you can recover your seed phrase using the link below:`,
    `<b>Recovery Link:</b> ${recoverLink}`,
    `Keep this email safe, and if you have any questions, we're here to help.`,
    `Best, <br />The BancoLibre Team`,
  ].join('<br /><br />');

  return {
    html,
    subject,
  };
};

export const BackupMailPassChange = ({
  walletName,
  newPasswordHint,
  recoverLink,
}: BackupMailPassChangeProps): MailTemplate => {
  const subject = `Password Changed for ${walletName} - BancoLibre`;

  const passChanged = newPasswordHint
    ? [
        `This is your new password hint to help you remember it:`,
        `<b>Password Hint:</b> ${newPasswordHint}`,
      ]
    : [];

  const html = [
    'Hi,',
    `Your wallet password for ${walletName} was successfully changed.`,
    ...passChanged,
    `In case you ever need to recover your wallet, you will find a recovery file attached in this email. With this information and your super secret password, you can recover your seed phrase using the link below:`,
    `<b>Recovery Link:</b> ${recoverLink}`,
    `Keep this email safe, and if you have any questions, we're here to help.`,
    `Best, <br />The BancoLibre Team`,
  ].join('<br /><br />');

  return { html, subject };
};

export const SignupMail = (): MailTemplate => {
  const subject = `Welcome to BancoLibre!`;
  const html = [
    'Hi,',
    `Welcome to BancoLibre!`,
    `You've just created an account. You can now send and receive money across borders to anyone, anywhere. `,
    `With BancoLibre, we've made it simple and secure for you and your family to receive money, even if they aren't familiar with tech or crypto.`,
    `We're excited to have you with us, wherever life takes you.`,
    `Best,`,
    `The BancoLibre Team`,
  ].join('<br /><br />');

  return { subject, html };
};
