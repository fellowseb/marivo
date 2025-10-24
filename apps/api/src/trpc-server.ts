import * as trpcExpress from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { createContext, router } from './trpc.ts';
import { deliveryMiddleware } from './infra/delivery.middleware.ts';
import { userMiddleware } from './domains/auth/user.middleware.ts';
import playsRoutes from './domains/plays/plays.trpc-routes.ts';
// import { dbTransactionMiddleware } from './shared/trpc-delivery.ts';

const appRouter = router({
  plays: playsRoutes,
});

export type AppRouter = typeof appRouter;

export default function trpcServer(): express.Application {
  const app = express();
  app.use(
    // Read requestId from request header
    deliveryMiddleware(),
    // Enable CORS for all routes
    cors(),
    // Handle Clerk auth
    clerkMiddleware(),
    // Attach user-related properties to the request
    userMiddleware(),
    // Application TRPC routes
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
      // middleware: dbTransactionMiddleware(),
    }),
  );
  return app;
}
