import trpcServer from "./trpc-server.ts";
import { getConfig } from "./infra/config.ts";
import { initStorage, getStorage } from "./infra/storage.ts";
import { initDatabase } from "./infra/db.ts";
import { initMessageBroker, getMessageBroker } from "./infra/message-broker.ts";
import { checkDatabase, waitForDependencies } from "./infra/health.ts";
import { getLogger } from "./infra/logger.ts";

function listen() {
  try {
    const trpcPort = getConfig().server.port;
    trpcServer().listen(trpcPort, () => {
      getLogger().info({ port: trpcPort }, "tRPC API server listening");
    });
  } catch (err) {
    getLogger().error({ err }, "listen failed");
  }
}

async function init() {
  try {
    // Read config
    // dotenv.config({
    //   path: ['.env', '.env.development.local'],
    // });
    // Init dependencies
    initDatabase();
    await initStorage();
    initMessageBroker();
    // Boot-time readiness gate: retry dependency checks, then fail fast so
    // the container restarts (restart: unless-stopped) until deps are up
    const ready = await waitForDependencies({
      checkDb: checkDatabase,
      checkRedis: () => getMessageBroker().ping(),
      checkStorage: () => getStorage().ping(),
    });
    if (!ready) {
      getLogger().error("dependencies not ready after retries, exiting");
      process.exit(1);
    }
    // Start listening
    listen();
  } catch (err) {
    getLogger().error({ err }, "init failed");
  }
}

init();
