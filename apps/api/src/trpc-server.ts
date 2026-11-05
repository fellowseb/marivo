import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { createContext, router } from "./trpc.ts";
import { deliveryMiddleware } from "./infra/delivery.middleware.ts";
import { workerAuthMiddleware } from "./infra/worker-auth.middleware.ts";
import { getLogger } from "./infra/logger.ts";
import { checkDatabase, createHealthRouter } from "./infra/health.ts";
import { getMessageBroker } from "./infra/message-broker.ts";
import { getStorage } from "./infra/storage.ts";
import { userMiddleware } from "./domains/auth/user.middleware.ts";
import playsRoutes from "./domains/plays/plays.trpc-routes.ts";
import playsCollectionRoutes from "./domains/plays/plays-collection.trpc-routes.ts";
import playsWorkerRoutes from "./domains/plays/plays-worker.trpc-routes.ts";
import storageRoutes from "./domains/storage/storage.trpc-routes.ts";
import scriptRoutes from "./domains/script/script.trpc-routes.ts";
import userPreferencesRoutes from "./domains/user-preferences/user-preferences.trpc-routes.ts";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

const appRouter = router({
  plays: playsRoutes,
  playsCollection: playsCollectionRoutes,
  script: scriptRoutes,
  userPreferences: userPreferencesRoutes,
});

const workerRouter = router({
  plays: playsWorkerRoutes,
  playsCollection: playsCollectionRoutes,
  storage: storageRoutes,
});

export type AppRouter = typeof appRouter;
export type AppRouterInput = inferRouterInputs<AppRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;

export default function trpcServer(): express.Application {
  const app = express();
  app.use(
    createHealthRouter({
      checkDb: checkDatabase,
      checkRedis: () => getMessageBroker().ping(),
      checkStorage: () => getStorage().ping(),
    }),
  );
  app.use(
    "/worker",
    // Read requestId from request header
    deliveryMiddleware(),
    // Authenticate worker using shared API key
    workerAuthMiddleware(),
    // Enable CORS for all routes
    cors({ credentials: true }),
    // Application TRPC routes
    trpcExpress.createExpressMiddleware({
      router: workerRouter,
      createContext,
      onError: (opts) => {
        const { error, type, path } = opts;
        getLogger().error({ err: error, type, path }, "tRPC error");
      },
    }),
  );
  app.use(
    // Read requestId from request header
    deliveryMiddleware(),
    // Enable CORS for all routes
    cors({
      credentials: true,
    }),
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
        getLogger().error({ err: error, type, path }, "tRPC error");
      },
    }),
  );
  return app;
}
