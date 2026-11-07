import z from "zod";
import { type LanguageValue } from "@marivo/utils";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPreferencesRepository } from "./user-preferences.repository.ts";
import { UserNotFound } from "./user-preferences.repository.ts";

export const GetUserLanguageUseCaseOutputSchema = z.object({
  language: z.string(),
});

type GetUserLanguageUseCaseOutput = z.infer<typeof GetUserLanguageUseCaseOutputSchema>;

export class GetUserLanguageUseCase extends AuthenticatedUseCase<{
  params: undefined;
  success: GetUserLanguageUseCaseOutput;
  failure: UserNotFound;
}> {
  constructor(repository: UserPreferencesRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute() {
    const result = await this.repository.getLanguage();
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ language: result.dataOrThrow() as LanguageValue });
  }

  private repository: UserPreferencesRepository;
}
