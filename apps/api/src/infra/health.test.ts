import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createHealthRouter, type HealthCheckDeps } from "./health.ts";

function makeApp(deps: HealthCheckDeps, timeoutMs = 2000) {
  const app = express();
  app.use(createHealthRouter(deps, timeoutMs));
  return app;
}

const allOk: HealthCheckDeps = {
  checkDb: async () => true,
  checkRedis: async () => true,
  checkStorage: async () => true,
};

describe("health router", () => {
  it("GET /health is always 200 (liveness)", async () => {
    const res = await request(makeApp(allOk)).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /health/ready is 200 when all dependencies are up", async () => {
    const res = await request(makeApp(allOk)).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ready",
      checks: { db: true, redis: true, storage: true },
    });
  });

  it("GET /health/ready is 503 with per-service detail when a dependency is down", async () => {
    const res = await request(
      makeApp({ ...allOk, checkDb: async () => false, checkRedis: async () => false }),
    ).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not_ready");
    expect(res.body.checks).toEqual({ db: false, redis: false, storage: true });
  });

  it("GET /health/ready is 503 when a check throws", async () => {
    const res = await request(
      makeApp({ ...allOk, checkStorage: async () => { throw new Error("boom"); } }),
    ).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.storage).toBe(false);
  });

  it("GET /health/ready is 503 when a check hangs past the timeout", async () => {
    const res = await request(
      makeApp({ ...allOk, checkDb: () => new Promise<boolean>(() => {}) }, 50),
    ).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.checks.db).toBe(false);
  });
});
