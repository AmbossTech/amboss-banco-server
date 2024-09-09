import { Request, Response } from 'express';

import { DataloaderTypes } from '../dataloader/dataloader.service';

export type ContextType = {
  req: Request;
  res: Response;
  ip: string | undefined;
  loaders: DataloaderTypes;
};
