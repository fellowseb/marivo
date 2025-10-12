import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { deliveryMiddleware } from './infra/delivery.middleware.ts';
import { userMiddleware } from './domains/auth/user.middleware.ts';
import playsRoutes from './domains/plays/plays.routes.ts';

dotenv.config({
  path: ['.env', '.env.development.local'],
});

const app = express();
const port = 3000;

// Global application middleware
app.use(
  deliveryMiddleware(),
  // Enable CORS for all routes
  cors(),
  // Handle Clerk auth
  clerkMiddleware(),
  // Currently all routes require user authentication
  requireAuth(),
  // Attach user-related properties to the request
  userMiddleware(),
);

playsRoutes.setup(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
