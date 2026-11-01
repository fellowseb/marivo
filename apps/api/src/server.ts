import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { deliveryMiddleware } from "./infra/delivery.middleware.ts";
import { userMiddleware } from "./domains/auth/user.middleware.ts";
import playsRoutes from "./domains/plays/plays.routes.ts";

export default function server(): express.Application {
  const app = express();
  // Global application middleware
  app.use(
    // Read requestId from request header
    deliveryMiddleware(),
    // Enable CORS for all routes
    cors(),
    // Handle Clerk auth
    clerkMiddleware(),
    // Attach user-related properties to the request
    userMiddleware(),
  );
  app.use("/plays", playsRoutes);
  return app;
}
