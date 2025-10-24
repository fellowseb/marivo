import { type Request } from 'express';
// import z from 'zod';
// import { publicProcedure } from '../trpc.ts';
import type { Provider } from '../shared/provider.ts';
import type {
  AnyUseCase,
  ParamsOfUseCase,
  SuccessOfUseCase,
} from '../shared/use-case.ts';
import sql from '../infra/db.ts';

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
          throw new Error('Use case failed', { cause: error });
        },
      });
    });
    return res as any;
  };
}

// export function useCaseMutationProcedure<T extends AnyUseCase>(params: {
//   provider: Provider<T>;
//   inputPayloadSchema: z.ZodType<ParamsOfUseCase<T>>;
//   outputSchema: z.ZodType<SuccessOfUseCase<T>>;
// }) {
//   return publicProcedure
//     .input(params.inputPayloadSchema)
//     .output(params.outputSchema)
//     .mutation(({ input, ctx }) => {
//       const inputTyped = input as ParamsOfUseCase<T>;
//       return handleUseCase(params.provider)({ ctx, input: inputTyped });
//     });
// }
//
// export function useCaseQueryProcedure<T extends AnyUseCase>(params: {
//   provider: Provider<T>;
//   inputParamsSchema?: z.Schema;
//   outputSchema?: z.Schema;
// }) {
//   let inputBuilder = publicProcedure;
//   let outputBuilder = publicProcedure;
//   if (params.inputParamsSchema) {
//     inputBuilder = publicProcedure.input(params.inputParamsSchema) as any;
//   }
//   if (params.outputSchema) {
//     outputBuilder = publicProcedure.output(params.outputSchema);
//   }
//   return publicProcedure
//     .concat(inputBuilder)
//     .concat(outputBuilder)
//     .query(({ ctx, input }) => {
//       const inputTyped = input as ParamsOfUseCase<T>;
//       return handleUseCase(params.provider)({ ctx, input: inputTyped });
//     });
// }
