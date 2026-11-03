import { Router } from "express";
import { getDatabase } from "./db.ts";
import { getLogger } from "./logger.ts";

export interface HealthCheckDeps {
  checkDb: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
  checkStorage: () => Promise<boolean>;
}

async function withTimeout(check: Promise<boolean>, timeoutMs: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      check,
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await getDatabase()`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export interface WaitForDependenciesOptions {
  retries?: number;
  delayMs?: number;
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Boot-time readiness gate: retry the dependency checks for a bounded time
 * and report whether everything came up. Callers typically exit non-zero
 * when this returns false so the container restarts until deps are ready.
 */
export async function waitForDependencies(
  deps: HealthCheckDeps,
  options: WaitForDependenciesOptions = {},
): Promise<boolean> {
  const { retries = 5, delayMs = 3000, timeoutMs = 2000 } = options;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const [db, redis, storage] = await Promise.all([
      withTimeout(deps.checkDb(), timeoutMs),
      withTimeout(deps.checkRedis(), timeoutMs),
      withTimeout(deps.checkStorage(), timeoutMs),
    ]);
    if (db && redis && storage) {
      return true;
    }
    getLogger().warn(
      { attempt, retries, db, redis, storage },
      "dependency check attempt failed",
    );
    if (attempt < retries) {
      await sleep(delayMs);
    }
  }
  return false;
}

/**
 * Liveness (`/health`) + readiness (`/health/ready`) probes.
 * Liveness only checks the process is up; readiness verifies the
 * dependencies (db, redis, storage) with a bounded timeout.
 */
export function createHealthRouter(deps: HealthCheckDeps, timeoutMs = 2000): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  router.get("/health/ready", async (_req, res) => {
    const [db, redis, storage] = await Promise.all([
      withTimeout(deps.checkDb(), timeoutMs),
      withTimeout(deps.checkRedis(), timeoutMs),
      withTimeout(deps.checkStorage(), timeoutMs),
    ]);
    const checks = { db, redis, storage };
    const ready = db && redis && storage;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
  });

  return router;
}
