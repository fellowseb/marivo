import { createReadStream, createWriteStream } from 'node:fs';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
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
import { Languages, type Language } from './script-imports.models.ts';
import { PlaysCollectionRepository } from './plays-collection.repository.ts';

export const SetScriptImportResultUseCaseInputSchema = z.object({
  importId: z.string().length(36),
  result: z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      metadata: z.object({
        title: z.string(),
        author: z.string(),
        genre: z.string(),
        period: z.string(),
        language: z.string(),
        characters: z.array(
          z.object({
            id: z.string().length(36),
            name: z.string(),
            description: z.string(),
            genre: z.string(),
          }),
        ),
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
    playsCollectionRepository: PlaysCollectionRepository,
    storageService: Storage,
  ) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
    this.scriptRepository = scriptRepository;
    this.storageService = storageService;
    this.playsCollectionRepository = playsCollectionRepository;
  }

  async execute(
    input: SetScriptImportResultUseCaseInput,
  ): Promise<Result<undefined, ScriptImportNotFound>> {
    const { importId, result } = input;
    const res =
      await this.scriptImportsRepository.getScriptImportStatus(importId);
    if (res.isFailure()) {
      return Result.failure(res.errorOrThrow());
    }
    if (result.success) {
      const tempFilePath = join(
        tmpdir(),
        'marivo-imports',
        importId,
        'result-lines.csv',
      );
      const dirPath = path.dirname(tempFilePath);
      await fs.mkdir(dirPath, { recursive: true });
      const tempWriteStream = createWriteStream(tempFilePath);
      console.log('Downloading ', `${importId}/result-lines.csv`);
      const downloadStream = await this.storageService.download(
        'marivo-imports',
        `${importId}/result-lines.csv`,
      );
      await pipeline(downloadStream, tempWriteStream);
      // Save to temp file & read twice in two streams
      const linesStream = createReadStream(tempFilePath);
      const linesContentsStream = createReadStream(tempFilePath);
      const scriptId = await this.scriptRepository.createScriptFromStream({
        characters: result.metadata.characters.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.id]: curr.name,
          }),
          {},
        ),
        linesStream,
        linesContentsStream,
      });
      // Validate metadata
      const { metadata } = result;
      const validatedLanguage = Languages.includes(
        metadata.language as Language,
      )
        ? (metadata.language as Language)
        : undefined;
      const numberOfRoles = metadata.characters.length;
      const numberOfMaleRoles = metadata.characters.filter(
        ({ genre }) => genre === 'male',
      ).length;
      const numberOfFemaleRoles = metadata.characters.filter(
        ({ genre }) => genre === 'female',
      ).length;
      const suggestions: Record<string, string> = {};
      let validatedGenre = undefined;
      if (metadata.genre) {
        const allGenres = (await this.playsCollectionRepository.findAllGenres())
          .dataOrThrow()
          .map((record) => record.get('key'));
        if (allGenres.includes(metadata.genre)) {
          validatedGenre = metadata.genre;
        } else {
          suggestions.genre = metadata.genre;
        }
      }
      let validatedPeriod = undefined;
      if (metadata.period) {
        const allPeriods = (
          await this.playsCollectionRepository.findAllPeriods()
        )
          .dataOrThrow()
          .map((record) => record.get('key'));
        if (allPeriods.includes(metadata.period)) {
          validatedPeriod = metadata.period;
        } else {
          suggestions.period = metadata.period;
        }
      }
      await this.scriptImportsRepository.setScriptImportSuccess({
        importId,
        scriptId,
        metadata: {
          title: result.metadata.title,
          author: result.metadata.author,
          language: validatedLanguage,
          numberOfRoles,
          numberOfMaleRoles,
          numberOfFemaleRoles,
          genre: validatedGenre,
          period: validatedPeriod,
          suggestions,
          characters: result.metadata.characters,
        },
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
  private playsCollectionRepository: PlaysCollectionRepository;
  private storageService: Storage;
}
