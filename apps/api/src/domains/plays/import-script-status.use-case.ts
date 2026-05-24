import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type {
  ScriptImportNotFound,
  ScriptImportsRepository,
} from './script-imports.repository.ts';

export const ImportScriptStatusUseCaseInputSchema = z.object({
  importId: z.string().length(36),
});

export const ImportScriptStatusUseCaseOutputSchema = z.object({
  id: z.string().length(36),
  status: z.enum([
    'uploading_files',
    'processing_files',
    'reviewing',
    'done',
    'error',
  ]),
});

type ImportScriptStatusUseCaseInput = z.infer<
  typeof ImportScriptStatusUseCaseInputSchema
>;

type ImportScriptStatusUseCaseOutput = z.infer<
  typeof ImportScriptStatusUseCaseOutputSchema
>;

export class ImportScriptStatusUseCase extends AuthenticatedUseCase<{
  params: ImportScriptStatusUseCaseInput;
  success: ImportScriptStatusUseCaseOutput;
}> {
  constructor(
    userContext: UserContextService,
    scriptImportsRepository: ScriptImportsRepository,
  ) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(
    input: ImportScriptStatusUseCaseInput,
  ): Promise<Result<ImportScriptStatusUseCaseOutput, ScriptImportNotFound>> {
    const { importId } = input;
    return await this.scriptImportsRepository.getScriptImportStatus(importId);
  }

  private scriptImportsRepository: ScriptImportsRepository;
}
