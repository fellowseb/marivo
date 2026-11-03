import trpcServer from "./trpc-server.ts";
import { getConfig } from "./infra/config.ts";
import { initStorage } from "./infra/storage.ts";
import { initDatabase } from "./infra/db.ts";
import { initMessageBroker } from "./infra/message-broker.ts";

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
    // Set the region
    // Start listening
    listen();
  } catch (err) {
    console.error("Ini failed", err);
  }
}

init();
