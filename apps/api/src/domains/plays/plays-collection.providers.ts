import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { GetMetadataUseCase } from "./get-metadata.use-case.ts";
import { ListAllGenresUseCase } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCase } from "./list-all-periods.use-case.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";

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
};
