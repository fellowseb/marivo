import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { requirePlayPermission } from "../plays/play-permission.middleware.ts";
import { providers } from "./blocking.providers.ts";
import {
  GetStagePlanUseCaseInputSchema,
  GetStagePlanUseCaseOutputSchema,
} from "./get-stage-plan.use-case.ts";
import {
  ListStagePlansUseCaseInputSchema,
  ListStagePlansUseCaseOutputSchema,
} from "./list-stage-plans.use-case.ts";
import {
  SaveStagePlanUseCaseInputSchema,
  SaveStagePlanUseCaseOutputSchema,
} from "./save-stage-plan.use-case.ts";
import {
  SetActiveStagePlanUseCaseInputSchema,
  SetActiveStagePlanUseCaseOutputSchema,
} from "./set-active-stage-plan.use-case.ts";
import {
  DuplicateStagePlanUseCaseInputSchema,
  DuplicateStagePlanUseCaseOutputSchema,
} from "./duplicate-stage-plan.use-case.ts";

export default router({
  getStagePlan: publicProcedure
    .input(GetStagePlanUseCaseInputSchema)
    .use(requirePlayPermission("blockingRead"))
    .output(GetStagePlanUseCaseOutputSchema)
    .query(handleUseCase(providers.GetStagePlanUseCase)),
  listStagePlans: publicProcedure
    .input(ListStagePlansUseCaseInputSchema)
    .use(requirePlayPermission("blockingRead"))
    .output(ListStagePlansUseCaseOutputSchema)
    .query(handleUseCase(providers.ListStagePlansUseCase)),
  saveStagePlan: publicProcedure
    .input(SaveStagePlanUseCaseInputSchema)
    .use(requirePlayPermission("blockingWrite"))
    .output(SaveStagePlanUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SaveStagePlanUseCase)),
  setActiveStagePlan: publicProcedure
    .input(SetActiveStagePlanUseCaseInputSchema)
    .use(requirePlayPermission("blockingWrite"))
    .output(SetActiveStagePlanUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SetActiveStagePlanUseCase)),
  duplicateStagePlan: publicProcedure
    .input(DuplicateStagePlanUseCaseInputSchema)
    .use(requirePlayPermission("blockingWrite"))
    .output(DuplicateStagePlanUseCaseOutputSchema)
    .mutation(handleUseCase(providers.DuplicateStagePlanUseCase)),
});
