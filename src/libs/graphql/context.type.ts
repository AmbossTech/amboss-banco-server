import { IpwareIpInfo } from '@fullerstack/nax-ipware';
import { Request, Response } from 'express';

export type ContextType = {
  req: Request;
  res: Response;
  ipInfo: IpwareIpInfo | null;
};
