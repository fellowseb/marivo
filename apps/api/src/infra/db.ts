import { InternalServerError } from "../shared/error.ts";
import { getConfig, type AppConfig } from "./config.ts";
import postgres from "postgres";

let sql: ReturnType<typeof postgres>;

export function initDatabase(config: AppConfig = getConfig()) {
  const { postgres: pg } = config;
  sql = postgres({
    transform: {
      // Avoid the automagic snake_case to camelCase transforms
      // ...postgres.camel,
      undefined: null,
    },
    host: pg.host,
    port: pg.port,
    database: pg.database,
    username: pg.username,
    password: pg.password,
    // Explicit pool settings: bound the number of connections, recycle idle
    // ones and fail fast when Postgres is unreachable (seconds).
    max: pg.pool.max,
    connect_timeout: pg.pool.connectTimeout,
    idle_timeout: pg.pool.idleTimeout,
    max_lifetime: pg.pool.maxLifetime,
  });
}

export function getDatabase() {
  if (!sql) {
    throw new InternalServerError("Database not initialized");
  }
  return sql;
}
