import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'That resource does not exist.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.status : 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong on our side. Please retry.' : err.message,
  });
}

export const asyncRoute =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
