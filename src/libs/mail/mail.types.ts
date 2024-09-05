import { MessageAttachment } from 'mailgun.js';

export type RecoveryFileType = {
  date: string;
  email: string;
  walletName: string;
  passwordHint: string | null;
  encryptedMnemonic: string;
  encryptedSymmetricKey: string;
  recoverLink: string;
};

export type SendEmailProps = {
  subject: string;
  email: string;
  variables: { content: string } & Record<string, any>;
  attachment?: MessageAttachment;
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

export type SendSignupDetails = {
  to: MailTo;
};
