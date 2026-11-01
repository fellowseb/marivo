import z from 'zod';
import { Result } from '@marivo/utils';
import { type UseCase } from '../../shared/use-case.ts';
import { ScriptNotFound, ScriptRepository } from './script.repository.ts';
import type { PlayNotFound, UserPlaysRepository } from '../plays/user-plays.repository.ts';

export const DeleteLineUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
});

export const DeleteLineUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type DeleteLineUseCaseInput = z.infer<typeof DeleteLineUseCaseInputSchema>;
type DeleteLineUseCaseOutput = z.infer<typeof DeleteLineUseCaseOutputSchema>;

export class DeleteLineUseCase
  implements
    UseCase<{
      params: DeleteLineUseCaseInput;
      success: DeleteLineUseCaseOutput;
    }>
{
  constructor(
    scriptRepository: ScriptRepository,
    userPlaysRepository: UserPlaysRepository,
  ) {
    this.scriptRepository = scriptRepository;
    this.userPlaysRepository = userPlaysRepository;
  }

  async execute(params: {
    uri: string;
    lineId: string;
  }): Promise<Result<DeleteLineUseCaseOutput, ScriptNotFound | PlayNotFound>> {
    const scriptIdResult = await this.userPlaysRepository.getScriptId({
      uri: params.uri,
    });
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.deleteLine({
          scriptId,
          lineId: params.lineId,
        });
      },
      failure: async (error) => {
        return Result.failure(error);
      },
    });
  }

  private scriptRepository: ScriptRepository;
  private userPlaysRepository: UserPlaysRepository;
}
