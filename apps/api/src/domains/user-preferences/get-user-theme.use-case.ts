import z from "zod";
import { type ThemeValue } from "@marivo/utils";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { UserPreferencesRepository } from "./user-preferences.repository.ts";
import { UserNotFound } from "./user-preferences.repository.ts";

export const GetUserThemeUseCaseOutputSchema = z.object({
  theme: z.string(),
});

type GetUserThemeUseCaseOutput = z.infer<typeof GetUserThemeUseCaseOutputSchema>;

export class GetUserThemeUseCase extends AuthenticatedUseCase<{
  params: undefined;
  success: GetUserThemeUseCaseOutput;
  failure: UserNotFound;
}> {
  constructor(repository: UserPreferencesRepository, userContextService: UserContextService) {
    super(userContextService);
    this.repository = repository;
  }

  async execute() {
    const result = await this.repository.getTheme();
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ theme: result.dataOrThrow() as ThemeValue });
  }

  private repository: UserPreferencesRepository;
}
