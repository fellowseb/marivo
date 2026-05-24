import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { AppError } from '../../shared/error.ts';
import { ScriptImportsRepository } from './script-imports.repository.ts';

export const InitImportScriptUseCaseInputSchema = z.object({
  importId: z.string().length(36),
  files: z.array(
    z.discriminatedUnion('type', [
      z.object({
        id: z.string(),
        type: z.literal('url'),
        url: z.url(),
      }),
      z.object({
        id: z.string(),
        type: z.literal('file'),
        size: z.number(),
        name: z.string(),
      }),
    ]),
  ),
});

type InitImportScriptUseCaseInput = z.infer<
  typeof InitImportScriptUseCaseInputSchema
>;

class InitImportScriptUseCase extends AuthenticatedUseCase<{
  params: InitImportScriptUseCaseInput;
  failure: AppError;
}> {
  constructor(
    scriptImportsRepository: ScriptImportsRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(input: InitImportScriptUseCaseInput) {
    const { files, importId } = input;
    await this.scriptImportsRepository.initImport({
      importId,
      files,
    });
    return Result.ok(undefined);
  }

  private scriptImportsRepository: ScriptImportsRepository;
}

export default InitImportScriptUseCase;
