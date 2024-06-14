import { LnUrlCurrencyType } from 'src/api/contact/contact.types';

export type GetCurrenciesAuto = {
  getLightningCurrency: LnUrlCurrencyType[];
  getOtherCurrencies: LnUrlCurrencyType[];
};
