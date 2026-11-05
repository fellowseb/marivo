import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { GetMetadataUseCase } from "./get-metadata.use-case.ts";
import { ListAllGenresUseCase } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCase } from "./list-all-periods.use-case.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import { ToggleBookmarkUseCase } from "./toggle-bookmark.use-case.ts";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { GetCollectionPlayUseCase } from "./get-collection-play.use-case.ts";
import { UpdateCollectionPlayMetadataUseCase } from "./update-collection-play-metadata.use-case.ts";
import { SetCollectionPlayArchivedUseCase } from "./set-collection-play-archived.use-case.ts";
import { DeleteCollectionPlayUseCase } from "./delete-collection-play.use-case.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { ScriptImportsRepository } from "./script-imports.repository.ts";

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
  GetCollectionPlay: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new GetCollectionPlayUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<GetCollectionPlayUseCase>,
  UpdateCollectionPlayMetadata: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new UpdateCollectionPlayMetadataUseCase(
        playsCollectionRepository,
        userContextService,
      );
    },
  } as Provider<UpdateCollectionPlayMetadataUseCase>,
  SetCollectionPlayArchived: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new SetCollectionPlayArchivedUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<SetCollectionPlayArchivedUseCase>,
  DeleteCollectionPlay: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      return new DeleteCollectionPlayUseCase(playsCollectionRepository, userContextService);
    },
  } as Provider<DeleteCollectionPlayUseCase>,
  AddToCollection: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const playsCollectionRepository = new PlaysCollectionRepository(sql, userContextService);
      const importsRepository = new ScriptImportsRepository(sql, userContextService);
      return new AddPlayToCollectionUseCase(
        playsCollectionRepository,
        importsRepository,
        userContextService,
      );
    },
  } as Provider<AddPlayToCollectionUseCase>,
};
