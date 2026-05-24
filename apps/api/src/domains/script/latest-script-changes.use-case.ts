import z from 'zod';
import { assertUnreachable, Result } from '@marivo/utils';
import { type UseCase } from '../../shared/use-case.ts';
import { type ScriptDiff } from './script.models.ts';
import { ScriptNotFound, ScriptRepository } from './script.repository.ts';
import type {
  PlayNotFound,
  UserPlaysRepository,
} from '../plays/user-plays.repository.ts';
import type {
  ScriptImportNotFound,
  ScriptImportsRepository,
} from '../plays/script-imports.repository.ts';

export const LatestScriptChangesUseCaseInputSchema = z.object({
  uri: z.uuid(),
  from: z.enum(['play', 'import']),
  since: z.date(),
});

export const LatestScriptChangesUseCaseOutputSchema = z.object({
  diffs: z.array(
    z.union([
      z.object({
        id: z.uuidv4(),
        lineId: z.uuidv4(),
        lastModifiedDate: z.date(),
        type: z.union([z.literal('saved_version'), z.literal('shared_draft')]),
        version: z.number().min(0).nullable(),
        authorUsername: z.string().nullable(),
        change: z.union([
          z.object({
            type: z.literal('content_delete'),
          }),
          z.object({
            type: z.literal('content_create_update'),
            content: z.union([
              z.object({
                lineType: z.literal('heading'),
                headingLevel: z.number().min(0),
                text: z.string(),
              }),
              z.object({
                lineType: z.literal('chartext'),
                characters: z.array(z.string()),
                text: z.string(),
              }),
              z.object({
                lineType: z.literal('freetext'),
                text: z.string(),
              }),
            ]),
          }),
        ]),
      }),
      z.object({
        id: z.uuidv4(),
        lastModifiedDate: z.date(),
        lineType: z.union([
          z.literal('freetext'),
          z.literal('chartext'),
          z.literal('heading'),
        ]),
        change: z.object({
          type: z.literal('line_create'),
        }),
      }),
    ]),
  ),
  lastModifiedDate: z.date(),
  linesOrder: z.array(z.uuidv4()),
  characters: z.record(z.uuidv4(), z.string()),
  checksum: z.string().length(32),
});

type LatestScriptChangesUseCaseInput = z.infer<
  typeof LatestScriptChangesUseCaseInputSchema
>;
type LatestScriptChangesUseCaseOutput = z.infer<
  typeof LatestScriptChangesUseCaseOutputSchema
>;

export class LatestScriptChangesUseCase
  implements
    UseCase<{
      params: LatestScriptChangesUseCaseInput;
      success: LatestScriptChangesUseCaseOutput;
    }>
{
  constructor(
    scriptRepository: ScriptRepository,
    userPlaysRepository: UserPlaysRepository,
    scriptImportsRepository: ScriptImportsRepository,
  ) {
    this.scriptRepository = scriptRepository;
    this.userPlaysRepository = userPlaysRepository;
    this.scriptImportsRepository = scriptImportsRepository;
  }

  async execute(params: {
    uri: string;
    from: 'play' | 'import';
    since: Date;
  }): Promise<
    Result<ScriptDiff, ScriptNotFound | PlayNotFound | ScriptImportNotFound>
  > {
    let scriptIdResult;
    if (params.from === 'play') {
      scriptIdResult = await this.userPlaysRepository.getScriptId({
        uri: params.uri,
      });
    } else if (params.from === 'import') {
      scriptIdResult = await this.scriptImportsRepository.getResultScriptId({
        id: params.uri,
      });
    } else {
      assertUnreachable(params.from);
    }
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.getLatestScriptChanges({
          id: scriptId,
          since: params.since,
        });
      },
      failure: async (data) => {
        return Result.failure(data);
      },
    });
  }

  private scriptRepository: ScriptRepository;
  private userPlaysRepository: UserPlaysRepository;
  private scriptImportsRepository: ScriptImportsRepository;
}
