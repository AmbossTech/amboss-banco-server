import { v5 } from 'uuid';

import { PasskeyOptionsType } from './passkey.types';

export const REGISTRATION_TIMEOUT_IN_MS = 60_000 * 5;

export const getPasskeyId = (id: string) => v5(id, v5.URL);

export const getAccountRegistrationKey = (
  accountId: string,
  type: PasskeyOptionsType,
) => `webauthn-registration-${type}-${accountId}`;

export const getAccountAuthenticationKey = (accountId: string) =>
  `webauthn-authentication-${accountId}`;

export const AAGUID_JSON_URL =
  'https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json';
