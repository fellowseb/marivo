import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getLogger } from "./logger.ts";

const REQUEST_ID_HEADER = "x-marivo-request-id";

export function deliveryMiddleware(): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers[REQUEST_ID_HEADER];
    if (requestId) {
      if (typeof requestId === "string") {
        const context = req.context ?? {};
        context.requestId = requestId;
        req.context = context;
        res.setHeader(REQUEST_ID_HEADER, requestId);
      } else {
        getLogger().warn({ header: REQUEST_ID_HEADER }, "invalid request id header format");
      }
    }
    next();
  };
}
