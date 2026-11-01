import { publicProcedure, router } from "../../trpc.ts";
import { providers } from "./script.providers.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import {
  LatestScriptChangesUseCaseInputSchema,
  LatestScriptChangesUseCaseOutputSchema,
} from "./latest-script-changes.use-case.ts";
import {
  SaveLineContentUseCaseInputSchema,
  SaveLineContentUseCaseOutputSchema,
} from "./save-line-content.use-case.ts";
import {
  CreateLineUseCaseInputSchema,
  CreateLineUseCaseOutputSchema,
} from "./create-line.use-case.ts";
import {
  DeleteLineUseCaseInputSchema,
  DeleteLineUseCaseOutputSchema,
} from "./delete-line.use-case.ts";

export default router({
  latestChanges: publicProcedure
    .input(LatestScriptChangesUseCaseInputSchema)
    .output(LatestScriptChangesUseCaseOutputSchema)
    .query(handleUseCase(providers.LatestScriptChangesUseCase)),
  saveLineContent: publicProcedure
    .input(SaveLineContentUseCaseInputSchema)
    .output(SaveLineContentUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SaveLineContentUseCase)),
  createLine: publicProcedure
    .input(CreateLineUseCaseInputSchema)
    .output(CreateLineUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreateLineUseCase)),
  deleteLine: publicProcedure
    .input(DeleteLineUseCaseInputSchema)
    .output(DeleteLineUseCaseOutputSchema)
    .mutation(handleUseCase(providers.DeleteLineUseCase)),
});
