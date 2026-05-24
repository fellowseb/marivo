import type { Request } from 'express';
import superjson from 'superjson';
import type { Sql } from 'postgres';
import { initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { getDatabase } from './infra/db.ts';

export interface TrpcContext {
  req: Request;
  sql: Sql;
}

// created for each request
export const createContext = ({
  req,
}: trpcExpress.CreateExpressContextOptions): TrpcContext => {
  return {
    req,
    sql: getDatabase(),
  };
};

type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
