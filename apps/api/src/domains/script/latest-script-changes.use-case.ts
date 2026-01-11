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
    z.union([
      z.object({
        id: z.uuidv4(),
        lineId: z.uuidv4(),
        lastModifiedDate: z.date(),
        type: z.union([z.literal('saved_version'), z.literal('shared_draft')]),
        version: z.number().min(1).nullable(),
        authorUsername: z.string(),
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
