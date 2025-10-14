import { router, publicProcedure } from '../../trpc.ts';
import { providers } from './plays.providers.ts';
import { GetAllPlaysUseCaseOutputSchema } from './get-all-plays.use-case.ts';

export default router({
  list: publicProcedure
    .output(GetAllPlaysUseCaseOutputSchema)
    .query(async ({ ctx }) => {
      const useCase = providers.GetAllPlaysUseCase.instantiate(ctx.req);
      const playsResult = await useCase.execute();
      return playsResult.match({
        success: ({ plays }) => ({
          plays,
        }),
        failure: (error) => {
          throw new Error('Use case failed', { cause: error });
        },
      });
    }),
});
