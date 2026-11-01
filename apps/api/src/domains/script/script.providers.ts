import { type Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { ScriptImportsRepository } from "../plays/script-imports.repository.ts";
import { UserPlaysRepository } from "../plays/user-plays.repository.ts";
import { LatestScriptChangesUseCase } from "./latest-script-changes.use-case.ts";
import { SaveLineContentUseCase } from "./save-line-content.use-case.ts";
import { CreateLineUseCase } from "./create-line.use-case.ts";
import { DeleteLineUseCase } from "./delete-line.use-case.ts";
import { ScriptRepository } from "./script.repository.ts";

export const providers = {
  LatestScriptChangesUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      const scriptRepository = new ScriptRepository(sql, userService);
      const userPlaysRepository = new UserPlaysRepository(sql, userService);
      const scriptImportsRepository = new ScriptImportsRepository(sql, userService);
      return new LatestScriptChangesUseCase(
        scriptRepository,
        userPlaysRepository,
        scriptImportsRepository,
      );
    },
  } as Provider<LatestScriptChangesUseCase>,
  SaveLineContentUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      const scriptRepository = new ScriptRepository(sql, userService);
      const userPlaysRepository = new UserPlaysRepository(sql, userService);
      return new SaveLineContentUseCase(scriptRepository, userPlaysRepository);
    },
  } as Provider<SaveLineContentUseCase>,
  CreateLineUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      const scriptRepository = new ScriptRepository(sql, userService);
      const userPlaysRepository = new UserPlaysRepository(sql, userService);
      return new CreateLineUseCase(scriptRepository, userPlaysRepository);
    },
  } as Provider<CreateLineUseCase>,
  DeleteLineUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      const scriptRepository = new ScriptRepository(sql, userService);
      const userPlaysRepository = new UserPlaysRepository(sql, userService);
      return new DeleteLineUseCase(scriptRepository, userPlaysRepository);
    },
  } as Provider<DeleteLineUseCase>,
};
