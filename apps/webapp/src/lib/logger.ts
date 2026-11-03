/**
 * Structured logger for the webapp (browser console).
 *
 * Every entry is logged as a single object with `ts`, `level` and `message`
 * (plus optional context fields), so logs stay inspectable in devtools and
 * greppable when serialized. The level threshold comes from
 * VITE_LOG_LEVEL (debug|info|warn|error); defaults to debug in dev, info in
 * production builds.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentThreshold(): number {
  const fromEnv = import.meta.env.VITE_LOG_LEVEL as string | undefined;
  if (fromEnv && fromEnv in LEVEL_PRIORITY) {
    return LEVEL_PRIORITY[fromEnv as LogLevel];
  }
  return import.meta.env.DEV ? LEVEL_PRIORITY.debug : LEVEL_PRIORITY.info;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] < currentThreshold()) {
    return;
  }
  console[level]({ ts: new Date().toISOString(), service: "marivo-webapp", level, message, ...context });
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};
