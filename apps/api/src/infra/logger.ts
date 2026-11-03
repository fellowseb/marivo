import pino, { type Logger } from "pino";
import { getConfig } from "./config.ts";

let instance: Logger | undefined;

/**
 * Shared structured (JSON-lines) logger for the API.
 * The level comes from config (`logging.level` / LOG_LEVEL env var).
 */
export function getLogger(): Logger {
  instance ??= pino({
    level: getConfig().logging.level,
    base: { service: "marivo-api" },
  });
  return instance;
}

/**
 * Request-scoped child logger: carries the request id extracted by the
 * delivery middleware (x-marivo-request-id) so log lines can be correlated.
 */
export function getRequestLogger(requestId: string | undefined): Logger {
  const logger = getLogger();
  return requestId ? logger.child({ requestId }) : logger;
}
