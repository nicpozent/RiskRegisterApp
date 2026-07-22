import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route handler so a rejected promise is forwarded to Express's
 * error-handling middleware instead of leaving the request hanging. Express 5
 * forwards rejections from async handlers natively, so this is now belt-and-
 * braces, but it keeps the contract explicit without churning every route.
 *
 * Params default to Record<string, string>: every route in this app uses
 * single-valued named params (`:id`, `:userId`, ...), so the `string | string[]`
 * widening that @types/express 5 applies to the default ParamsDictionary (for
 * repeatable `*`-style params, which this app does not use) never applies here.
 */
export function asyncHandler(
  fn: (req: Request<Record<string, string>>, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler<Record<string, string>> {
  return (req, res, next) => { fn(req, res, next).catch(next); };
}
