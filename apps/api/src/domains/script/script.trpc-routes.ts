import { publicProcedure, router } from "../../trpc.ts";
import { providers } from "./script.providers.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { requirePlayPermission } from "../plays/play-permission.middleware.ts";
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
import {
  DeleteLineContentUseCaseInputSchema,
  DeleteLineContentUseCaseOutputSchema,
} from "./delete-line-content.use-case.ts";

export default router({
  latestChanges: publicProcedure
    .input(LatestScriptChangesUseCaseInputSchema)
    .use(requirePlayPermission("scriptRead"))
    .output(LatestScriptChangesUseCaseOutputSchema)
    .query(handleUseCase(providers.LatestScriptChangesUseCase)),
  saveLineContent: publicProcedure
    .input(SaveLineContentUseCaseInputSchema)
    .use(requirePlayPermission("scriptWrite"))
    .output(SaveLineContentUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SaveLineContentUseCase)),
  createLine: publicProcedure
    .input(CreateLineUseCaseInputSchema)
    .use(requirePlayPermission("scriptWrite"))
    .output(CreateLineUseCaseOutputSchema)
    .mutation(handleUseCase(providers.CreateLineUseCase)),
  deleteLine: publicProcedure
    .input(DeleteLineUseCaseInputSchema)
    .use(requirePlayPermission("scriptWrite"))
    .output(DeleteLineUseCaseOutputSchema)
    .mutation(handleUseCase(providers.DeleteLineUseCase)),
  deleteLineContent: publicProcedure
    .input(DeleteLineContentUseCaseInputSchema)
    .use(requirePlayPermission("scriptWrite"))
    .output(DeleteLineContentUseCaseOutputSchema)
    .mutation(handleUseCase(providers.DeleteLineContentUseCase)),
});
