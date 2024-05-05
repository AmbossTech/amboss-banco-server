import { Request } from 'express';

export const parseAuthHeader = (str: string) => {
  return str.startsWith('Bearer ') ? str.split(' ')[1] : '';
};

export const getAuthToken = (req: Request): string => {
  const authHeader =
    req.headers['authorization'] || req.headers['Authorization'] || '';

  if (typeof authHeader !== 'string') return '';
  return parseAuthHeader(authHeader);
};
