import * as trpcExpress from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { createContext, router } from './trpc.ts';
import { deliveryMiddleware } from './infra/delivery.middleware.ts';
import { userMiddleware } from './domains/auth/user.middleware.ts';
import playsRoutes from './domains/plays/plays.trpc-routes.ts';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

const appRouter = router({
  plays: playsRoutes,
});

export type AppRouter = typeof appRouter;
export type AppRouterInput = inferRouterInputs<AppRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;

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
      onError: (opts) => {
        const { error, type, path } = opts;
        console.error(error, type, path);
      },
    }),
  );
  return app;
}
