import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route handler so a rejected promise is forwarded to Express's
 * error-handling middleware instead of leaving the request hanging.
 * (Express 4 does not await handlers, so unhandled rejections never respond.)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => { fn(req, res, next).catch(next); };
}
