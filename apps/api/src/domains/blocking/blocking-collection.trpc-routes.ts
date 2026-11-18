import z from "zod";
import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { collectionProviders } from "./blocking-collection.providers.ts";
import {
  CreateStageLibraryPlanInputSchema,
  GetStageLibraryPlanOutputSchema,
  ListStageLibraryPlansInputSchema,
  ListStageLibraryPlansOutputSchema,
  UpdateStageLibraryPlanInputSchema,
} from "./collection-stage-plan.use-cases.ts";

const idInput = z.object({ id: z.number().int().positive() });

/**
 * Server-side stage library (#230). Reads are open to any authenticated user;
 * mutations are capability-gated inside the use cases (create/edit/delete_stage_plan,
 * collection-maintainer role from Clerk metadata).
 */
export default router({
  listStageLibraryPlans: publicProcedure
    .input(ListStageLibraryPlansInputSchema)
    .output(ListStageLibraryPlansOutputSchema)
    .query(handleUseCase(collectionProviders.ListStageLibraryPlansUseCase)),
  getStageLibraryPlan: publicProcedure
    .input(idInput)
    .output(GetStageLibraryPlanOutputSchema)
    .query(handleUseCase(collectionProviders.GetStageLibraryPlanUseCase)),
  createStageLibraryPlan: publicProcedure
    .input(CreateStageLibraryPlanInputSchema)
    .output(GetStageLibraryPlanOutputSchema)
    .mutation(handleUseCase(collectionProviders.CreateStageLibraryPlanUseCase)),
  updateStageLibraryPlan: publicProcedure
    .input(UpdateStageLibraryPlanInputSchema)
    .output(GetStageLibraryPlanOutputSchema)
    .mutation(handleUseCase(collectionProviders.UpdateStageLibraryPlanUseCase)),
  deleteStageLibraryPlan: publicProcedure
    .input(idInput)
    .output(z.undefined())
    .mutation(handleUseCase(collectionProviders.DeleteStageLibraryPlanUseCase)),
});
