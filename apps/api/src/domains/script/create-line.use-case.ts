import z from "zod";
import { Result } from "@marivo/utils";
import { type UseCase } from "../../shared/use-case.ts";
import { ScriptNotFound, ScriptRepository } from "./script.repository.ts";
import type { PlayNotFound, UserPlaysRepository } from "../plays/user-plays.repository.ts";

export const CreateLineUseCaseInputSchema = z.object({
  uri: z.uuid(),
  lineId: z.uuidv4(),
  lineType: z.enum(["heading", "chartext", "freetext"]),
  position: z.number().min(0),
});

export const CreateLineUseCaseOutputSchema = z.object({
  lastModifiedDate: z.date(),
});

type CreateLineUseCaseInput = z.infer<typeof CreateLineUseCaseInputSchema>;
type CreateLineUseCaseOutput = z.infer<typeof CreateLineUseCaseOutputSchema>;

export class CreateLineUseCase implements UseCase<{
  params: CreateLineUseCaseInput;
  success: CreateLineUseCaseOutput;
}> {
  constructor(scriptRepository: ScriptRepository, userPlaysRepository: UserPlaysRepository) {
    this.scriptRepository = scriptRepository;
    this.userPlaysRepository = userPlaysRepository;
  }

  async execute(params: {
    uri: string;
    lineId: string;
    lineType: "heading" | "chartext" | "freetext";
    position: number;
  }): Promise<Result<CreateLineUseCaseOutput, ScriptNotFound | PlayNotFound>> {
    const scriptIdResult = await this.userPlaysRepository.getScriptId({
      uri: params.uri,
    });
    return scriptIdResult.match({
      success: async (scriptId) => {
        return await this.scriptRepository.createLine({
          scriptId,
          lineId: params.lineId,
          lineType: params.lineType,
          position: params.position,
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
