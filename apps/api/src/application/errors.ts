/** An error carrying an HTTP status, mapped to a response by the error middleware. */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const forbidden = (msg = 'forbidden') => new HttpError(403, msg);
