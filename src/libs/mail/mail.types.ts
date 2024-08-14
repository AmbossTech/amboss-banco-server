export type SendEmailProps = {
  subject: string;
  email: string;
  variables: { handlebars: string } & Record<string, any>;
};
