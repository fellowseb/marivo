import { publicProcedure, router } from '../../trpc.ts';
import { handleUseCase } from '../../shared/trpc-delivery.ts';
import { providers } from './plays.providers.ts';
import { SetScriptImportResultUseCaseInputSchema } from './set-script-import-result.use-case.ts';

export default router({
  setScriptImportResult: publicProcedure
    .input(SetScriptImportResultUseCaseInputSchema)
    .mutation(handleUseCase(providers.SetScriptImportResultUseCase)),
});
