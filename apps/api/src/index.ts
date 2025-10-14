import dotenv from 'dotenv';
import server from './server.ts';
import trpcServer from './trpc-server.ts';

dotenv.config({
  path: ['.env', '.env.development.local'],
});

// const port = process.env.PORT ?? 3000;
// server().listen(port, () => {
//   console.log(`API server istening on ${port}`);
// });

const trpcPort = process.env.TRPC_PORT ?? 3001;
trpcServer().listen(trpcPort, () => {
  console.log(`tRPC API server istening on ${trpcPort}`);
});
