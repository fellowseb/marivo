import { type Request } from 'express';
import type { Provider } from '../shared/provider.ts';
import type {
  AnyUseCase,
  ParamsOfUseCase,
  SuccessOfUseCase,
} from '../shared/use-case.ts';
import sql from '../infra/db.ts';
import { AppError } from './error.ts';
import { TRPCError } from '@trpc/server';

export function dbTransactionMiddleware() {
  return async ({ ctx, next }: any) => {
    return await sql.begin(async (sql) => {
      return next({
        ctx: {
          ...ctx,
          sql,
        },
      });
    });
  };
}

export function appErrorToTrpcError(err: unknown) {
  if (err instanceof AppError) {
    return new TRPCError({
      message: err.toString(),
      code: err.code,
      cause: err.cause,
    });
  }
  return new TRPCError({
    message: `${err}`,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export function handleUseCase<T extends AnyUseCase>(provider: Provider<T>) {
  return async ({
    ctx,
    input,
  }: {
    ctx: { req: Request };
    input: ParamsOfUseCase<T>;
  }): Promise<SuccessOfUseCase<T>> => {
    const res = await sql.begin<SuccessOfUseCase<T>>(async (sql) => {
      const uc = provider.instantiate({ req: ctx.req, sql });
      const result = await uc.execute(input);
      return result.match({
        success: (data) => data,
        failure: (error) => {
          throw appErrorToTrpcError(error);
        },
      });
    });
    return res as any;
  };
}
