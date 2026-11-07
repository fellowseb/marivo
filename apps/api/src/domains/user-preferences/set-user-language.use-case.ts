import z from "zod";
import { LANGUAGE_VALUES, type LanguageValue } from "@marivo/utils";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPreferencesRepository } from "./user-preferences.repository.ts";
import { UserNotFound } from "./user-preferences.repository.ts";

export const SetUserLanguageUseCaseInputSchema = z.object({
  language: z.enum(LANGUAGE_VALUES),
});

export const SetUserLanguageUseCaseOutputSchema = z.object({
  language: z.string(),
});

type SetUserLanguageUseCaseInput = z.infer<typeof SetUserLanguageUseCaseInputSchema>;
type SetUserLanguageUseCaseOutput = z.infer<typeof SetUserLanguageUseCaseOutputSchema>;

export class SetUserLanguageUseCase extends AuthenticatedUseCase<{
  params: SetUserLanguageUseCaseInput;
  success: SetUserLanguageUseCaseOutput;
  failure: UserNotFound;
}> {
  constructor(repository: UserPreferencesRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: SetUserLanguageUseCaseInput) {
    const language = input.language as LanguageValue;
    const result = await this.repository.setLanguage(language);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ language: result.dataOrThrow() });
  }

  private repository: UserPreferencesRepository;
}
