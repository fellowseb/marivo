import z from "zod";
import { THEME_VALUES, type ThemeValue } from "@marivo/utils";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPreferencesRepository } from "./user-preferences.repository.ts";
import { UserNotFound } from "./user-preferences.repository.ts";

export const SetUserThemeUseCaseInputSchema = z.object({
  theme: z.enum(THEME_VALUES),
});

export const SetUserThemeUseCaseOutputSchema = z.object({
  theme: z.string(),
});

type SetUserThemeUseCaseInput = z.infer<typeof SetUserThemeUseCaseInputSchema>;
type SetUserThemeUseCaseOutput = z.infer<typeof SetUserThemeUseCaseOutputSchema>;

export class SetUserThemeUseCase extends AuthenticatedUseCase<{
  params: SetUserThemeUseCaseInput;
  success: SetUserThemeUseCaseOutput;
  failure: UserNotFound;
}> {
  constructor(repository: UserPreferencesRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute(input: SetUserThemeUseCaseInput) {
    const theme = input.theme as ThemeValue;
    const result = await this.repository.setTheme(theme);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ theme: result.dataOrThrow() });
  }

  private repository: UserPreferencesRepository;
}
