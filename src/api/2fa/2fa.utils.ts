import { two_fa_method } from '@prisma/client';

export const twoFactorSessionKey = (id: string) => `twoFactorSession-${id}`;
export const twoFactorPendingKey = (accountId: string, method: two_fa_method) =>
  `twoFactorPending-${accountId}-${method}`;
