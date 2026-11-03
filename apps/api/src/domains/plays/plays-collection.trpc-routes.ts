import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { providers } from "./plays-collection.providers.ts";
import { GetMetadataUseCaseOutputSchema } from "./get-metadata.use-case.ts";
import { ListAllGenresUseCaseOutputSchema } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCaseOutputSchema } from "./list-all-periods.use-case.ts";

export default router({
  getMetadata: publicProcedure
    .output(GetMetadataUseCaseOutputSchema)
    .query(handleUseCase(providers.GetMetadata)),
  listAllGenres: publicProcedure
    .output(ListAllGenresUseCaseOutputSchema)
    .query(handleUseCase(providers.ListAllGenres)),
  listAllPeriods: publicProcedure
    .output(ListAllPeriodsUseCaseOutputSchema)
    .query(handleUseCase(providers.ListAllPeriods)),
});
