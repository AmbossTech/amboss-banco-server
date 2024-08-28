export type SendEmailProps = {
  subject: string;
  email: string;
  variables: { content: string } & Record<string, any>;
};

export type MailTo = {
  id?: string;
  email?: string;
};

export type SendBackupDetails = {
  to: MailTo;
  walletName: string;
  encryptedMnemonic: string;
};

export type SendBackupChangePassDetails = {
  to: MailTo;
  walletName: string;
  encryptedMnemonic: string;
};
