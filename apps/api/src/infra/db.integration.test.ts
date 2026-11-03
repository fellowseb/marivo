import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase, testDatabaseEnv } from "../test-utils/db.ts";
import { loadConfig } from "./config.ts";
import { getDatabase, initDatabase } from "./db.ts";

describe("db infra (integration with real Postgres)", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("initDatabase connects with explicit pool options and serves queries", async () => {
    // Full chain: env vars -> JSON defaults -> validated config -> pool
    const config = loadConfig({
      env: { ...testDatabaseEnv(), POSTGRES_POOL_MAX: "3" },
      nodeEnv: "test",
    });
    initDatabase(config);
    const sql = getDatabase();

    // Pool options are actually applied to the client
    expect(sql.options.max).toBe(3);
    expect(sql.options.idle_timeout).toBe(20);

    const [row] = await sql<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(row?.ok).toBe(1);

    await sql.end();
  });
});
