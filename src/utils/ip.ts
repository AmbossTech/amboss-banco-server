import { Ipware } from '@fullerstack/nax-ipware';
import { Request } from 'express';

const ipware = new Ipware();

export const getIp = (req: Request): string | undefined => {
  const ipInfo = ipware.getClientIP(req);

  if (!ipInfo?.ip) return undefined;
  if (ipInfo.ip.includes('127.0.0.1')) return undefined;

  return ipInfo.ip;
};
