import type { Request } from 'express';
import superjson from 'superjson';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

export interface TrpcContext {
  req: Request;
}

// created for each request
export const createContext = ({
  req,
}: trpcExpress.CreateExpressContextOptions): TrpcContext => {
  return {
    req,
  };
};

type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
