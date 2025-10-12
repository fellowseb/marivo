import type { NextFunction, Request, RequestHandler, Response } from 'express';

const REQUEST_ID_HEADER = 'x-marivo-request-id';

export function deliveryMiddleware(): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers[REQUEST_ID_HEADER];
    if (requestId) {
      if (typeof requestId === 'string') {
        let context = req.context ?? {};
        context.requestId = requestId;
        req.context = context;
        res.setHeader(REQUEST_ID_HEADER, requestId);
      } else {
        console.warn(`Invalid format found for ${REQUEST_ID_HEADER} header`);
      }
    }
    next();
  };
}
