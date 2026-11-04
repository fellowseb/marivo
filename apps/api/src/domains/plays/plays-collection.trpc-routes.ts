import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { providers } from "./plays-collection.providers.ts";
import { GetMetadataUseCaseOutputSchema } from "./get-metadata.use-case.ts";
import { ListAllGenresUseCaseOutputSchema } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCaseOutputSchema } from "./list-all-periods.use-case.ts";
import {
  ListAllScriptsUseCaseInputSchema,
  ListAllScriptsUseCaseOutputSchema,
} from "./list-all-scripts.use-case.ts";
import {
  ToggleBookmarkUseCaseInputSchema,
  ToggleBookmarkUseCaseOutputSchema,
} from "./toggle-bookmark.use-case.ts";
import {
  AddPlayToCollectionUseCaseInputSchema,
  AddPlayToCollectionUseCaseOutputSchema,
} from "./add-play-to-collection.use-case.ts";

export default router({
  getMetadata: publicProcedure
    .output(GetMetadataUseCaseOutputSchema)
    .query(handleUseCase(providers.GetMetadata)),
  listAll: publicProcedure
    .input(ListAllScriptsUseCaseInputSchema)
    .output(ListAllScriptsUseCaseOutputSchema)
    .query(handleUseCase(providers.ListAllScripts)),
  toggleBookmark: publicProcedure
    .input(ToggleBookmarkUseCaseInputSchema)
    .output(ToggleBookmarkUseCaseOutputSchema)
    .mutation(handleUseCase(providers.ToggleBookmark)),
  addToCollection: publicProcedure
    .input(AddPlayToCollectionUseCaseInputSchema)
    .output(AddPlayToCollectionUseCaseOutputSchema)
    .mutation(handleUseCase(providers.AddToCollection)),
  listAllGenres: publicProcedure
    .output(ListAllGenresUseCaseOutputSchema)
    .query(handleUseCase(providers.ListAllGenres)),
  listAllPeriods: publicProcedure
    .output(ListAllPeriodsUseCaseOutputSchema)
    .query(handleUseCase(providers.ListAllPeriods)),
});
