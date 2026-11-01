import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Authenticate worker requests using a shared API key.
 * The worker sends the key in the `x-marivo-worker-api-key` header.
 * The expected key is read from the WORKER_API_KEY env var.
 */
export function workerAuthMiddleware(): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction) {
    const expectedKey = process.env.WORKER_API_KEY;
    if (!expectedKey) {
      console.error("WORKER_API_KEY is not set - refusing all worker requests");
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }
    const providedKey = req.headers["x-marivo-worker-api-key"];
    if (typeof providedKey !== "string" || providedKey !== expectedKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}
