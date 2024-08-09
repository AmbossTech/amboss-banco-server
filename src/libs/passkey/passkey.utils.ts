import { v5 } from 'uuid';

export const REGISTRATION_TIMEOUT_IN_MS = 60_000 * 5;

export const getPasskeyId = (id: string) => v5(id, v5.URL);

export const getTwoFactorRegistrationKey = (accountId: string) =>
  `webauthn-twofactor-registration-${accountId}`;

export const getTwoFactorAuthenticationKey = (accountId: string) =>
  `webauthn-twofactor-authentication-${accountId}`;

export const AAGUID_JSON_URL =
  'https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json';
