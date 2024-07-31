import { randomBytes } from 'crypto';

// Same defaults as those in Bitwarden
export const ARGON_DEFAULTS = {
  hash_length: 32,
  iterations: 3,
  memory: 64000,
  parallelism: 4,
};

export const generateOtpSecret = () => {
  const buffer = randomBytes(15);
  return buffer.toString('utf8').replace(/=/g, '').substring(0, 24);
};
