import trpcServer from "./trpc-server.ts";
import { getConfig } from "./infra/config.ts";
import { initStorage, getStorage } from "./infra/storage.ts";
import { initDatabase } from "./infra/db.ts";
import { initMessageBroker, getMessageBroker } from "./infra/message-broker.ts";
import { checkDatabase, waitForDependencies } from "./infra/health.ts";

function listen() {
  try {
    const trpcPort = getConfig().server.port;
    trpcServer().listen(trpcPort, () => {
      console.log(`tRPC API server istening on ${trpcPort}`);
    });
  } catch (err) {
    console.error("Listen failed", err);
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
      console.error("[health] dependencies not ready after retries, exiting");
      process.exit(1);
    }
    // Start listening
    listen();
  } catch (err) {
    console.error("Ini failed", err);
  }
}

init();
