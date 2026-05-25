import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { AppError } from '../../shared/error.ts';
import type { ScriptImportsRepository } from './script-imports.repository.ts';
import type { ScriptImport } from './script-imports.models.ts';

export const GetAllScriptImportsUseCaseOutputSchema = z.array(
  z.object({
    id: z.string().length(36),
    status: z.enum([
      'uploading_files',
      'processing_files',
      'reviewing',
      'done',
      'error',
    ]),
  }),
);

type GetAllScriptImportsUseCaseOutput = z.infer<
  typeof GetAllScriptImportsUseCaseOutputSchema
>;

export class GetAllScriptImportsUseCase extends AuthenticatedUseCase<{
  params: undefined;
  success: GetAllScriptImportsUseCaseOutput;
  failure: AppError;
}> {
  constructor(
    userContext: UserContextService,
    scriptImportsRepository: ScriptImportsRepository,
  ) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(): Promise<Result<GetAllScriptImportsUseCaseOutput, AppError>> {
    const imports = await this.scriptImportsRepository.getScriptImports();
    const result = imports.map((imp: ScriptImport) => ({
      id: imp.id,
      status: imp.status,
    }));
    return Result.ok(result);
  }

  private scriptImportsRepository: ScriptImportsRepository;
}
