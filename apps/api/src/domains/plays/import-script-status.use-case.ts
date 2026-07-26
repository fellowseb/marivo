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

export const ImportScriptStatusUseCaseOutputSchema = z.discriminatedUnion(
  'status',
  [
    z.object({
      id: z.string().length(36),
      status: z.union([
        z.literal('uploading_files'),
        z.literal('processing_files'),
        z.literal('done'),
        z.literal('error'),
      ]),
    }),
    z.object({
      id: z.string().length(36),
      status: z.literal('reviewing'),
      metadata: z.object({
        title: z.string(),
        author: z.string(),
        language: z.string(),
        characters: z.array(z.any()),
        number_of_roles: z.number(),
        number_of_male_roles: z.number(),
        number_of_female_roles: z.number(),
        genre: z.string().optional(),
        period: z.string().optional(),
        suggestions: z.object().optional(),
      }),
    }),
  ],
);

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
