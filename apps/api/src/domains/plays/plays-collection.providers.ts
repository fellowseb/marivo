import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { GetMetadataUseCase } from "./get-metadata.use-case.ts";
import { ListAllGenresUseCase } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCase } from "./list-all-periods.use-case.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import { ToggleBookmarkUseCase } from "./toggle-bookmark.use-case.ts";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { UserPlaysRepository } from "./user-plays.repository.ts";

export const providers = {
  GetMetadata: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new GetMetadataUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<GetMetadataUseCase>,
  ListAllGenres: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new ListAllGenresUseCase(playsCollectionRepository);
    },
  } as Provider<ListAllGenresUseCase>,
  ListAllPeriods: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new ListAllPeriodsUseCase(playsCollectionRepository);
    },
  } as Provider<ListAllPeriodsUseCase>,
  ListAllScripts: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new ListAllScriptsUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<ListAllScriptsUseCase>,
  ToggleBookmark: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new ToggleBookmarkUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<ToggleBookmarkUseCase>,
  AddToCollection: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      const playsRepository = new UserPlaysRepository(sql, userContextService);
      return new AddPlayToCollectionUseCase(
        playsCollectionRepository,
        playsRepository,
        userContextService,
      );
    },
  } as Provider<AddPlayToCollectionUseCase>,
};
