import z from 'zod';
import { Result } from '@marivo/utils';
import { type UseCase } from '../../shared/use-case.ts';
import { type ScriptDiff } from './script.models.ts';
import { ScriptOfPlayNotFound, ScriptRepository } from './script.repository.ts';

export const LatestScriptChangesUseCaseInputSchema = z.object({
  playUri: z.uuidv4(),
  since: z.date(),
});

export const LatestScriptChangesUseCaseOutputSchema = z.object({
  diffs: z.array(
    z.object({
      id: z.uuidv4(),
      change: z.union([
        z.object({
          type: z.literal('delete'),
        }),
        z.object({
          type: z.literal('create_update'),
          content: z.union([
            z.object({
              type: z.literal('heading'),
              headingLevel: z.number().min(0),
              text: z.string(),
            }),
            z.object({
              type: z.literal('chartext'),
              characters: z.array(z.string()),
              text: z.string(),
            }),
            z.object({
              type: z.literal('freetext'),
              text: z.string(),
            }),
          ]),
        }),
      ]),
      lastModifiedDate: z.date(),
      version: z.number().min(1),
      previousVersionsIds: z.array(z.uuidv4()).optional(),
    }),
  ),
  lastModifiedDate: z.date(),
  linesOrder: z.array(z.uuidv4()),
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
  constructor(scriptRepository: ScriptRepository) {
    this.scriptRepository = scriptRepository;
  }

  async execute(params: {
    playUri: string;
    since: Date;
  }): Promise<Result<ScriptDiff, ScriptOfPlayNotFound>> {
    return await this.scriptRepository.getLatestScriptChanges({
      uri: params.playUri,
      since: params.since,
    });
  }

  private scriptRepository: ScriptRepository;
}
