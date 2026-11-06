import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { workerAuthMiddleware } from "./worker-auth.middleware.ts";
import { loadConfig } from "./config.ts";

function configWithApiKey(apiKey?: string) {
  return loadConfig({ env: apiKey ? { WORKER_API_KEY: apiKey } : {}, nodeEnv: "test" });
}

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("workerAuthMiddleware", () => {
  it("calls next when key matches", () => {
    const next = vi.fn();
    const req = makeReq({ "x-marivo-worker-api-key": "secret-key" });
    const res = makeRes();
    workerAuthMiddleware(configWithApiKey("secret-key"))(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("returns 401 when key is missing", () => {
    const next = vi.fn();
    const req = makeReq();
    const res = makeRes();
    workerAuthMiddleware(configWithApiKey("secret-key"))(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when key is wrong", () => {
    const next = vi.fn();
    const req = makeReq({ "x-marivo-worker-api-key": "wrong" });
    const res = makeRes();
    workerAuthMiddleware(configWithApiKey("secret-key"))(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("returns 500 when WORKER_API_KEY is not configured", () => {
    const next = vi.fn();
    const req = makeReq({ "x-marivo-worker-api-key": "anything" });
    const res = makeRes();
    workerAuthMiddleware(configWithApiKey(undefined))(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });
});
