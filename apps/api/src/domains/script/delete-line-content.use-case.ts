import z from "zod";
import { Result } from "@marivo/utils";
import { type UseCase } from "../../shared/use-case.ts";
import { ScriptNotFound, ScriptRepository } from "./script.repository.ts";
import type { PlayNotFound, UserPlaysRepository } from "../plays/user-plays.repository.ts";

export const DeleteLineContentUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  contentId: z.uuidv4(),
});

export const DeleteLineContentUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type DeleteLineContentUseCaseInput = z.infer<typeof DeleteLineContentUseCaseInputSchema>;
type DeleteLineContentUseCaseOutput = z.infer<typeof DeleteLineContentUseCaseOutputSchema>;

export class DeleteLineContentUseCase
  implements
    UseCase<{
      params: DeleteLineContentUseCaseInput;
      success: DeleteLineContentUseCaseOutput;
    }>
{
  constructor(
    scriptRepository: ScriptRepository,
    userPlaysRepository: UserPlaysRepository,
  ) {
    this.scriptRepository = scriptRepository;
    this.userPlaysRepository = userPlaysRepository;
  }

  async execute(
    params: DeleteLineContentUseCaseInput,
  ): Promise<Result<DeleteLineContentUseCaseOutput, ScriptNotFound | PlayNotFound>> {
    const scriptIdResult = await this.userPlaysRepository.getScriptId({
      uri: params.uri,
    });
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.deleteLineContent({
          scriptId,
          lineId: params.lineId,
          contentId: params.contentId,
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
