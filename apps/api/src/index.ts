import dotenv from 'dotenv';
import trpcServer from './trpc-server.ts';
import { initStorage } from './infra/storage.ts';
import { initDatabase } from './infra/db.ts';
import { initMessageBroker } from './infra/message-broker.ts';

function listen() {
  try {
    const trpcPort = process.env.TRPC_PORT ?? 3001;
    trpcServer().listen(trpcPort, () => {
      console.log(`tRPC API server istening on ${trpcPort}`);
    });
  } catch (err) {
    console.error('Listen failed', err);
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
    console.error('Ini failed', err);
  }
}

init();
