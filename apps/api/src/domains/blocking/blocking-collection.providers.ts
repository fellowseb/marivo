import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { CollectionStagePlanRepository } from "./collection-stage-plan.repository.ts";
import {
  CreateStageLibraryPlanUseCase,
  DeleteStageLibraryPlanUseCase,
  GetStageLibraryPlanUseCase,
  ListStageLibraryPlansUseCase,
  UpdateStageLibraryPlanUseCase,
} from "./collection-stage-plan.use-cases.ts";

function make(repository: CollectionStagePlanRepository, userService: UserContextService) {
  return {
    list: new ListStageLibraryPlansUseCase(repository, userService),
    get: new GetStageLibraryPlanUseCase(repository, userService),
    create: new CreateStageLibraryPlanUseCase(repository, userService),
    update: new UpdateStageLibraryPlanUseCase(repository, userService),
    delete: new DeleteStageLibraryPlanUseCase(repository, userService),
  };
}

export const collectionProviders = {
  ListStageLibraryPlansUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return make(new CollectionStagePlanRepository(sql, userService), userService).list;
    },
  } as Provider<ListStageLibraryPlansUseCase>,
  GetStageLibraryPlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return make(new CollectionStagePlanRepository(sql, userService), userService).get;
    },
  } as Provider<GetStageLibraryPlanUseCase>,
  CreateStageLibraryPlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return make(new CollectionStagePlanRepository(sql, userService), userService).create;
    },
  } as Provider<CreateStageLibraryPlanUseCase>,
  UpdateStageLibraryPlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return make(new CollectionStagePlanRepository(sql, userService), userService).update;
    },
  } as Provider<UpdateStageLibraryPlanUseCase>,
  DeleteStageLibraryPlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return make(new CollectionStagePlanRepository(sql, userService), userService).delete;
    },
  } as Provider<DeleteStageLibraryPlanUseCase>,
};
