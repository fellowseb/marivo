import z from 'zod';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { ScriptRepository } from '../script/script.repository.ts';
import type {
  ScriptImportNotFound,
  ScriptImportsRepository,
} from './script-imports.repository.ts';
import type { Storage } from '../../infra/storage.ts';
import { createReadStream, createWriteStream } from 'node:fs';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export const SetScriptImportResultUseCaseInputSchema = z.object({
  importId: z.string().length(36),
  result: z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      metadata: z.object({
        title: z.string(),
        genre: z.string(),
        language: z.string(),
        characters: z.array(z.object({
          id: z.string().length(36),
          name: z.string(),
          description: z.string(),
          genre: z.string(),
        })),
      }),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
});

type SetScriptImportResultUseCaseInput = z.infer<
  typeof SetScriptImportResultUseCaseInputSchema
>;

export class SetScriptImportResultUseCase extends AuthenticatedUseCase<{
  params: SetScriptImportResultUseCaseInput;
}> {
  constructor(
    userContext: UserContextService,
    scriptImportsRepository: ScriptImportsRepository,
    scriptRepository: ScriptRepository,
    storageService: Storage,
  ) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
    this.scriptRepository = scriptRepository;
    this.storageService = storageService;
  }

  async execute(
    input: SetScriptImportResultUseCaseInput,
  ): Promise<Result<undefined, ScriptImportNotFound>> {
    const { importId, result } = input;
    console.log('SetScriptImportResultUseCase', JSON.stringify(result));
    const res =
      await this.scriptImportsRepository.getScriptImportStatus(importId);
    if (res.isFailure()) {
      return Result.failure(res.errorOrThrow());
    }
    if (result.success) {
      console.log('metadata', result.metadata);
      const tempFilePath = join(tmpdir(), 'marivo-imports', importId, 'result-lines.csv');
      const dirPath = path.dirname(tempFilePath);
      await fs.mkdir(dirPath, { recursive: true });
      const tempWriteStream = createWriteStream(tempFilePath);
      const downloadStream = await this.storageService.download(
        'marivo-imports',
        `${importId}/result-lines.csv`,
      );
      await pipeline(downloadStream, tempWriteStream);
      // Save to temp file & read twice in two streams
      const linesStream = createReadStream(tempFilePath);
      const linesContentsStream = createReadStream(tempFilePath);
      const scriptId = await this.scriptRepository.createScriptFromStream({
        characters: result.metadata.characters.reduce((acc, curr) => ({
          ...acc,
          [curr.id]: curr.name,
        }), {}),
        linesStream,
        linesContentsStream,
      });
      await this.scriptImportsRepository.setScriptImportSuccess({
        importId,
        scriptId,
      });
    } else {
      console.log('error', result.error);
      await this.scriptImportsRepository.setScriptImportFailure({
        importId,
        error: result.error,
      });
    }
    return Result.ok(undefined);
  }

  private scriptImportsRepository: ScriptImportsRepository;
  private scriptRepository: ScriptRepository;
  private storageService: Storage;
}
