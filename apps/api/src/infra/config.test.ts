import { describe, it, expect } from "vitest";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENV_VAR_MAP, loadConfig } from "./config.ts";

const realConfigDir = new URL("../../config", import.meta.url).pathname;

describe("loadConfig", () => {
  it("loads defaults from default.json", () => {
    const config = loadConfig({ env: {}, nodeEnv: "nonexistent-env", configDir: realConfigDir });
    expect(config.server.port).toBe(3001);
    expect(config.postgres).toMatchObject({
      host: "postgres",
      port: 5432,
      database: "marivo",
      pool: { max: 10, connectTimeout: 10, idleTimeout: 20, maxLifetime: 1800 },
    });
    expect(config.redis).toEqual({ host: "redis", port: 6379 });
  });

  it("defaults logging.level to info and lets LOG_LEVEL override it", () => {
    const config = loadConfig({ env: {}, nodeEnv: "nonexistent-env", configDir: realConfigDir });
    expect(config.logging.level).toBe("info");

    const overridden = loadConfig({
      env: { LOG_LEVEL: "debug" },
      nodeEnv: "nonexistent-env",
      configDir: realConfigDir,
    });
    expect(overridden.logging.level).toBe("debug");
  });

  it("env vars override JSON values, coerced to the JSON type", () => {
    const config = loadConfig({
      env: {
        TRPC_PORT: "4000",
        POSTGRES_POOL_MAX: "25",
        POSTGRES_HOST: "db.local",
        GARAGE_SECRET_KEY: "s3cr3t",
      },
      nodeEnv: "nonexistent-env",
      configDir: realConfigDir,
    });
    expect(config.server.port).toBe(4000);
    expect(config.postgres.pool.max).toBe(25);
    expect(config.postgres.host).toBe("db.local");
    expect(config.garage.secretKey).toBe("s3cr3t");
  });

  it("merges {NODE_ENV}.json over default.json, and env beats the env file", () => {
    const dir = mkdtempSync(join(tmpdir(), "marivo-config-"));
    copyFileSync(join(realConfigDir, "default.json"), join(dir, "default.json"));
    writeFileSync(join(dir, "staging.json"), JSON.stringify({ server: { port: 8080 } }));

    const fromFile = loadConfig({ env: {}, nodeEnv: "staging", configDir: dir });
    expect(fromFile.server.port).toBe(8080);
    expect(fromFile.postgres.pool.max).toBe(10); // untouched by the overlay

    const fromEnv = loadConfig({
      env: { TRPC_PORT: "9000" },
      nodeEnv: "staging",
      configDir: dir,
    });
    expect(fromEnv.server.port).toBe(9000);
  });

  it("throws a clear error on an invalid numeric env value", () => {
    expect(() =>
      loadConfig({ env: { TRPC_PORT: "abc" }, nodeEnv: "nonexistent-env", configDir: realConfigDir }),
    ).toThrow(/Invalid number for config "server\.port"/);
  });

  it("every ENV_VAR_MAP entry points at an existing JSON path", () => {
    const config = loadConfig({ env: {}, nodeEnv: "nonexistent-env", configDir: realConfigDir });
    for (const path of Object.keys(ENV_VAR_MAP)) {
      const value = path
        .split(".")
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], config as unknown);
      expect(value, `missing config path ${path}`).not.toBeUndefined();
    }
  });
});
