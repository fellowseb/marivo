import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { StagePlanRepository } from "./stage-plan.repository.ts";
import { GetStagePlanUseCase } from "./get-stage-plan.use-case.ts";
import { ListStagePlansUseCase } from "./list-stage-plans.use-case.ts";
import { SaveStagePlanUseCase } from "./save-stage-plan.use-case.ts";
import { SetActiveStagePlanUseCase } from "./set-active-stage-plan.use-case.ts";
import { DuplicateStagePlanUseCase } from "./duplicate-stage-plan.use-case.ts";

export const providers = {
  GetStagePlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return new GetStagePlanUseCase(
        new StagePlanRepository(sql, userService),
        new UserPlaysRepository(sql, userService),
        userService,
      );
    },
  } as Provider<GetStagePlanUseCase>,
  ListStagePlansUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return new ListStagePlansUseCase(
        new StagePlanRepository(sql, userService),
        new UserPlaysRepository(sql, userService),
        userService,
      );
    },
  } as Provider<ListStagePlansUseCase>,
  SaveStagePlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return new SaveStagePlanUseCase(
        new StagePlanRepository(sql, userService),
        new UserPlaysRepository(sql, userService),
        userService,
      );
    },
  } as Provider<SaveStagePlanUseCase>,
  SetActiveStagePlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return new SetActiveStagePlanUseCase(
        new StagePlanRepository(sql, userService),
        new UserPlaysRepository(sql, userService),
        userService,
      );
    },
  } as Provider<SetActiveStagePlanUseCase>,
  DuplicateStagePlanUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      return new DuplicateStagePlanUseCase(
        new StagePlanRepository(sql, userService),
        new UserPlaysRepository(sql, userService),
        userService,
      );
    },
  } as Provider<DuplicateStagePlanUseCase>,
};
