import { InternalServerError } from "../shared/error.ts";
import postgres from "postgres";

let sql: ReturnType<typeof postgres>;

export interface DatabaseEnv {
  POSTGRES_HOST?: string | undefined;
  POSTGRES_PORT?: string | undefined;
  POSTGRES_DB?: string | undefined;
  POSTGRES_USERNAME?: string | undefined;
  POSTGRES_PASSWORD?: string | undefined;
  POSTGRES_POOL_MAX?: string | undefined;
  POSTGRES_CONNECT_TIMEOUT?: string | undefined;
  POSTGRES_IDLE_TIMEOUT?: string | undefined;
  POSTGRES_MAX_LIFETIME?: string | undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Explicit pool settings: bound the number of connections, recycle idle ones
 * and fail fast when Postgres is unreachable instead of hanging on a query.
 * All timeouts/lifetimes are in seconds.
 */
export function poolOptionsFromEnv(env: DatabaseEnv = process.env) {
  return {
    max: parsePositiveInt(env.POSTGRES_POOL_MAX, 10),
    connect_timeout: parsePositiveInt(env.POSTGRES_CONNECT_TIMEOUT, 10),
    idle_timeout: parsePositiveInt(env.POSTGRES_IDLE_TIMEOUT, 20),
    max_lifetime: parsePositiveInt(env.POSTGRES_MAX_LIFETIME, 30 * 60),
  };
}

export function initDatabase(env: DatabaseEnv = process.env) {
  sql = postgres({
    transform: {
      // Avoid the automagic snake_case to camelCase transforms
      // ...postgres.camel,
      undefined: null,
    },
    host: env.POSTGRES_HOST ?? "postgres",
    port: Number.parseInt(env.POSTGRES_PORT ?? "5432"),
    database: env.POSTGRES_DB ?? "marivo",
    username: env.POSTGRES_USERNAME ?? "",
    password: env.POSTGRES_PASSWORD ?? "",
    ...poolOptionsFromEnv(env),
  });
}

export function getDatabase() {
  if (!sql) {
    throw new InternalServerError("Database not initialized");
  }
  return sql;
}
