import { type Provider } from '../../shared/provider.ts';
import { UserContextService } from '../../shared/use-case.ts';
import { LatestScriptChangesUseCase } from './latest-script-changes.use-case.ts';
import { ScriptRepository } from './script.repository.ts';

export const providers = {
  LatestScriptChangesUseCase: {
    instantiate({ req, sql }) {
      const userService = new UserContextService(req);
      const scriptRepository = new ScriptRepository(sql, userService);
      return new LatestScriptChangesUseCase(scriptRepository);
    },
  } as Provider<LatestScriptChangesUseCase>,
};
