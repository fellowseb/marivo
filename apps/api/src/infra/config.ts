import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import z from "zod";

export const configSchema = z.object({
  server: z.object({
    port: z.number().int().positive(),
  }),
  postgres: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    pool: z.object({
      max: z.number().int().positive(),
      connectTimeout: z.number().int().nonnegative(),
      idleTimeout: z.number().int().nonnegative(),
      maxLifetime: z.number().int().nonnegative(),
    }),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number().int().positive(),
  }),
  garage: z.object({
    endpoint: z.string(),
    accessKey: z.string(),
    secretKey: z.string(),
  }),
  worker: z.object({
    apiKey: z.string(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Logical mapping between JSON config paths and env vars.
 * Env vars always override the JSON files (12-factor); the value type is
 * coerced from the JSON default (number / boolean / string).
 */
export const ENV_VAR_MAP: Record<string, string> = {
  "server.port": "TRPC_PORT",
  "postgres.host": "POSTGRES_HOST",
  "postgres.port": "POSTGRES_PORT",
  "postgres.database": "POSTGRES_DB",
  "postgres.username": "POSTGRES_USERNAME",
  "postgres.password": "POSTGRES_PASSWORD",
  "postgres.pool.max": "POSTGRES_POOL_MAX",
  "postgres.pool.connectTimeout": "POSTGRES_CONNECT_TIMEOUT",
  "postgres.pool.idleTimeout": "POSTGRES_IDLE_TIMEOUT",
  "postgres.pool.maxLifetime": "POSTGRES_MAX_LIFETIME",
  "redis.host": "REDIS_HOST",
  "redis.port": "REDIS_PORT",
  "garage.endpoint": "GARAGE_ENDPOINT",
  "garage.accessKey": "GARAGE_ACCESS_KEY",
  "garage.secretKey": "GARAGE_SECRET_KEY",
  "worker.apiKey": "WORKER_API_KEY",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = key in base ? deepMerge(base[key], value) : value;
    }
    return out;
  }
  return override;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (isPlainObject(acc) ? acc[key] : undefined), obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let target: Record<string, unknown> = obj;
  for (const key of keys.slice(0, -1)) {
    const next = target[key];
    if (!isPlainObject(next)) {
      throw new Error(`Config path "${path}" conflicts with a non-object value`);
    }
    target = next;
  }
  target[keys[keys.length - 1]!] = value;
}

function coerceLike(defaultValue: unknown, raw: string, path: string): unknown {
  if (typeof defaultValue === "number") {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number for config "${path}" from env: "${raw}"`);
    }
    return parsed;
  }
  if (typeof defaultValue === "boolean") {
    return raw === "true" || raw === "1";
  }
  return raw;
}

export interface LoadConfigOptions {
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
  configDir?: string;
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const env = options.env ?? process.env;
  const configDir = options.configDir ?? resolve(import.meta.dirname, "../../config");
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";

  const defaults = JSON.parse(readFileSync(resolve(configDir, "default.json"), "utf8")) as unknown;
  const envFile = resolve(configDir, `${nodeEnv}.json`);
  const layered = existsSync(envFile)
    ? deepMerge(defaults, JSON.parse(readFileSync(envFile, "utf8")))
    : defaults;

  const config = structuredClone(layered) as Record<string, unknown>;
  for (const [path, envVar] of Object.entries(ENV_VAR_MAP)) {
    const raw = env[envVar];
    if (raw !== undefined) {
      setPath(config, path, coerceLike(getPath(layered, path), raw, path));
    }
  }

  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  cached ??= loadConfig();
  return cached;
}
