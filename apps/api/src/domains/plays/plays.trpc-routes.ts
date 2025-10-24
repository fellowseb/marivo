import { publicProcedure, router } from '../../trpc.ts';
import { providers, ResourceAccessAuth } from './plays.providers.ts';
import { GetAllPlaysUseCaseOutputSchema } from './get-all-plays.use-case.ts';
import { RespondToInviteUseCaseInputSchema } from './respond-to-invite.use-case.ts';
import {
  CreatePlayUseCaseInputSchema,
  CreatePlayUseCaseOutputSchema,
} from './create-play.use-case.ts';
import { handleUseCase } from '../../shared/trpc-delivery.ts';
import z from 'zod';
import {
  PlayDetailsUseCaseInputSchema,
  PlayDetailsUseCaseOutputSchema,
} from './play-details.use-case.ts';
import type { Provider } from '../../shared/provider.ts';
import { AppError } from '../../shared/error.ts';
import sql from '../../infra/db.ts';

class Unauthorized extends AppError {
  constructor() {
    super('Unauthorized resource access', 'UNAUTHORIZED_ACCESS', 'client');
  }
}

function resourceAuth<T>(provider: Provider<ResourceAccessAuth<T>>) {
  return async ({ ctx, input, next }: any) => {
    const authChecker = provider.instantiate({ req: ctx.req, sql });
    const res = await authChecker.authorize({ ctx, input });
    if (res.isFailure()) {
      throw new Unauthorized();
    }
    return next();
  };
}

export default router({
  list: publicProcedure
    .input(z.undefined())
    .output(GetAllPlaysUseCaseOutputSchema)
    .query(handleUseCase(providers.GetAllPlaysUseCase)),
  respondToInvite: publicProcedure
    .input(RespondToInviteUseCaseInputSchema)
    .output(z.undefined())
    .mutation(handleUseCase(providers.RespondToInviteUseCase)),
  create: publicProcedure
    .input(CreatePlayUseCaseInputSchema)
    .output(CreatePlayUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreatePlayUseCase)),
  playDetails: publicProcedure
    .input(PlayDetailsUseCaseInputSchema)
    .use(resourceAuth(providers.PlayAccessChecker))
    .output(PlayDetailsUseCaseOutputSchema)
    .query(handleUseCase(providers.PlayDetailsUseCase)),
});
