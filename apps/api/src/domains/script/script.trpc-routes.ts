import { publicProcedure, router } from '../../trpc.ts';
import { providers } from './script.providers.ts';
import { handleUseCase } from '../../shared/trpc-delivery.ts';
import {
  LatestScriptChangesUseCaseInputSchema,
  LatestScriptChangesUseCaseOutputSchema,
} from './latest-script-changes.use-case.ts';

export default router({
  latestChanges: publicProcedure
    .input(LatestScriptChangesUseCaseInputSchema)
    .output(LatestScriptChangesUseCaseOutputSchema)
    .query(handleUseCase(providers.LatestScriptChangesUseCase)),
});
