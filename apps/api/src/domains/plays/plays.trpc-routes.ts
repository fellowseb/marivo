import z from 'zod';
import { octetInputParser } from '@trpc/server/http';
import { publicProcedure, router } from '../../trpc.ts';
import {
  appErrorToTrpcError,
  handleUseCase,
} from '../../shared/trpc-delivery.ts';
import type { Provider } from '../../shared/provider.ts';
import { getDatabase } from '../../infra/db.ts';
import { providers, ResourceAccessAuth } from './plays.providers.ts';
import { GetAllPlaysUseCaseOutputSchema } from './get-all-plays.use-case.ts';
import { RespondToInviteUseCaseInputSchema } from './respond-to-invite.use-case.ts';
import {
  CreatePlayUseCaseInputSchema,
  CreatePlayUseCaseOutputSchema,
} from './create-play.use-case.ts';
import { DeletePlayUseCaseInputSchema } from './delete-play.use-case.ts';
import {
  PlayDetailsUseCaseInputSchema,
  PlayDetailsUseCaseOutputSchema,
} from './play-details.use-case.ts';
import { InitImportScriptUseCaseInputSchema } from './init-import-script.use-case.ts';
import {
  ImportScriptStatusUseCaseInputSchema,
  ImportScriptStatusUseCaseOutputSchema,
} from './import-script-status.use-case.ts';
import {
  CreatePlayFromImportUseCaseInputSchema,
  CreatePlayFromImportUseCaseOutputSchema,
} from './create-play-from-import.use-case.ts';
import { GetAllScriptImportsUseCaseOutputSchema } from './get-all-script-imports.use-case.ts';

function resourceAuth<T>(provider: Provider<ResourceAccessAuth<T>>) {
  return async ({ ctx, input, next }: any) => {
    await getDatabase().begin(async (sql) => {
      const authChecker = provider.instantiate({ req: ctx.req, sql });
      const res = await authChecker.authorize({ ctx, input });
      if (res.isFailure()) {
        const err = res.errorOrThrow();
        throw appErrorToTrpcError(err);
      }
    });
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
  delete: publicProcedure
    .input(DeletePlayUseCaseInputSchema)
    .output(z.undefined())
    .mutation(handleUseCase(providers.DeletePlayUseCase)),
  createFromImport: publicProcedure
    .input(CreatePlayFromImportUseCaseInputSchema)
    .output(CreatePlayFromImportUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreatePlayFromImportUseCase)),
  playDetails: publicProcedure
    .input(PlayDetailsUseCaseInputSchema)
    .use(resourceAuth(providers.PlayAccessChecker))
    .output(PlayDetailsUseCaseOutputSchema)
    .query(handleUseCase(providers.PlayDetailsUseCase)),
  initImportScript: publicProcedure
    .input(InitImportScriptUseCaseInputSchema)
    .mutation(handleUseCase(providers.InitImportScriptUseCase)),
  uploadFileForScriptImport: publicProcedure
    .input(octetInputParser)
    .mutation(handleUseCase(providers.UploadFileForScriptImportUseCase)),
  importScriptStatus: publicProcedure
    .input(ImportScriptStatusUseCaseInputSchema)
    .output(ImportScriptStatusUseCaseOutputSchema)
    .query(handleUseCase(providers.ImportScriptStatusUseCase)),
  allScriptImports: publicProcedure
    .input(z.undefined())
    .output(GetAllScriptImportsUseCaseOutputSchema)
    .query(handleUseCase(providers.GetAllScriptImportsUseCase)),
});
