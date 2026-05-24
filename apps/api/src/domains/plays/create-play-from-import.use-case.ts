import z from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { UserPlaysRepository } from './user-plays.repository.ts';
import { ScriptImportNotFound, ScriptImportsRepository } from './script-imports.repository.ts';

export const CreatePlayFromImportUseCaseInputSchema = z.object({
  title: z.string().max(100),
  importId: z.string(),
});

export const CreatePlayFromImportUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type CreatePlayFromImportUseCaseInput = z.infer<typeof CreatePlayFromImportUseCaseInputSchema>;
type CreatePlayFromImportUseCaseOutput = z.infer<typeof CreatePlayFromImportUseCaseOutputSchema>;

class CreatePlayFromImportUseCase extends AuthenticatedUseCase<{
  params: CreatePlayFromImportUseCaseInput;
  success: CreatePlayFromImportUseCaseOutput;
  failure: ScriptImportNotFound;
}> {
  constructor(
    playsRepository: UserPlaysRepository,
    importsRepository: ScriptImportsRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.playsRepository = playsRepository;
    this.importsRepository = importsRepository;
  }

  async execute(input: CreatePlayFromImportUseCaseInput) {
    const { title, importId } = input;
    const uri = uuidv7();
    const scriptIdResult = await this.importsRepository.getResultScriptId({ id: importId });
    if (scriptIdResult.isFailure()) {
      return Result.failure(scriptIdResult.errorOrThrow());
    }
    const scriptId = scriptIdResult.dataOrThrow();
    await this.playsRepository.createPlay({ title, uri, scriptId });
    return Result.ok({ uri });
  }

  private playsRepository: UserPlaysRepository;
  private importsRepository: ScriptImportsRepository;
}

export default CreatePlayFromImportUseCase;
