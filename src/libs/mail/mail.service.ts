import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import formData from 'form-data';
import Mailgun, { MailgunMessageData } from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces';

import { CustomLogger, Logger } from '../logging';
import { SendEmailProps } from './mail.types';

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

  async send({ subject, email, variables }: SendEmailProps) {
    if (!this.mailgun) return;

    const data: MailgunMessageData = {
      from: `Banco <noreply@${this.mailgun.domain}>`,
      to: [email],
      subject,
      template: '',
      'h:X-Mailgun-Variables': JSON.stringify(variables),
    };

    await this.mailgun.client.messages
      .create(this.mailgun.domain, data)
      .then((res) => this.logger.silly('Email sent', { res }))
      .catch((err) => this.logger.error('Error sending email', { err }));
  }
}
