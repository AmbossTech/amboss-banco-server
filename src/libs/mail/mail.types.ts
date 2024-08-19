export type SendEmailProps = {
  subject: string;
  email: string;
  variables: { content: string } & Record<string, any>;
};

export type SendBackupDetails = {
  to: string;
  date: Date;
  walletName: string;
  encryptedMnemonic: string;
  passwordHint: string;
};

export type SendBackupChangePassDetails = {
  to: string;
  date: Date;
  walletName: string;
  passwordHint: string;
};

export type SendSignupDetails = {
  to: string;
  passwordHint: string;
};
