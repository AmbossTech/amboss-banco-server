import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import formData from 'form-data';
import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import Mailgun, { MailgunMessageData } from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';
import path from 'path';

import { CustomLogger, Logger } from '../logging';
import { BackupMail, BackupMailPassChange, SignupMail } from './mail.template';
import {
  SendBackupChangePassDetails,
  SendBackupDetails,
  SendEmailProps,
  SendSignupDetails,
} from './mail.types';

@Injectable()
export class MailService {
  private mailgun?: {
    client: IMailgunClient;
    domain: string;
  };

  constructor(
    private configService: ConfigService,
    @Logger(MailService.name) private logger: CustomLogger,
  ) {
    const apiKey = this.configService.get<string>(`mailgun.apiKey`);
    const domain = this.configService.get<string>(`mailgun.domain`);

    if (!apiKey || !domain) return;

    const mailgun = new Mailgun(formData);

    this.mailgun = {
      client: mailgun.client({
        username: 'api',
        key: apiKey,
      }),
      domain,
    };
  }

  async sendBackupMail(props: SendBackupDetails) {
    await this.send({
      email: props.to,
      subject: `Wallet Created - ${props.walletName}`,
      variables: {
        content: BackupMail({
          date: props.date.toUTCString(),
          passwordHint: props.passwordHint,
          walletName: props.walletName,
          encryptedMnemonic: props.encryptedMnemonic,
          recoverLink: 'https://bancolibre.com/recover',
        }),
      },
    });
  }

  async sendBackupMailPassChange(props: SendBackupChangePassDetails) {
    await this.send({
      email: props.to,
      subject: `Password changed - ${props.walletName}`,
      variables: {
        content: BackupMailPassChange({
          recoverLink: 'https://bancolibre.com/recover',
          date: props.date.toString(),
          newPasswordHint: props.passwordHint,
          walletName: props.walletName,
        }),
      },
    });
  }

  async sendSignupMail(props: SendSignupDetails) {
    await this.send({
      email: props.to,
      subject: `Welcome to BancoLibre!`,
      variables: {
        content: SignupMail({
          to: props.to,
          recoverLink: 'https://bancolibre.com/recover',
          date: new Date().toUTCString(),
          passwordHint: props.passwordHint,
        }),
      },
    });
  }

  private async send({ subject, email, variables }: SendEmailProps) {
    if (!this.mailgun) return;

    const htmlTemplate = readFileSync(
      path.resolve('./mail/templates/banco.html'),
      'utf8',
    );

    const template = Handlebars.compile(htmlTemplate);
    const finalMessage = template(variables);

    const data: MailgunMessageData = {
      from: `BancoLibre <noreply@${this.mailgun.domain}>`,
      to: [email],
      subject,
      html: finalMessage,
    };

    await this.mailgun.client.messages
      .create(this.mailgun.domain, data)
      .then((res) => this.logger.silly('Email sent', { res }))
      .catch((err) => this.logger.error('Error sending email', { err }));
  }
}
