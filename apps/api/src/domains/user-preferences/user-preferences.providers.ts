import type { Provider } from "../../shared/provider.ts";
import { UserContextService } from "../../shared/use-case.ts";
import { GetUserThemeUseCase } from "./get-user-theme.use-case.ts";
import { SetUserThemeUseCase } from "./set-user-theme.use-case.ts";
import {
  PostgresUserPreferencesRepository,
  type UserPreferencesRepository,
} from "./user-preferences.repository.ts";

export const providers = {
  GetUserTheme: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const repository: UserPreferencesRepository =
        new PostgresUserPreferencesRepository(sql, userContextService);
      return new GetUserThemeUseCase(repository, userContextService);
    },
  } as Provider<GetUserThemeUseCase>,
  SetUserTheme: {
    instantiate({ req, sql }) {
      const userContextService = new UserContextService(req);
      const repository: UserPreferencesRepository =
        new PostgresUserPreferencesRepository(sql, userContextService);
      return new SetUserThemeUseCase(repository, userContextService);
    },
  } as Provider<SetUserThemeUseCase>,
};
