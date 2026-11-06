import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { providers } from "./user-preferences.providers.ts";
import { GetUserThemeUseCaseOutputSchema } from "./get-user-theme.use-case.ts";
import {
  SetUserThemeUseCaseInputSchema,
  SetUserThemeUseCaseOutputSchema,
} from "./set-user-theme.use-case.ts";

export default router({
  getTheme: publicProcedure
    .output(GetUserThemeUseCaseOutputSchema)
    .query(handleUseCase(providers.GetUserTheme)),
  setTheme: publicProcedure
    .input(SetUserThemeUseCaseInputSchema)
    .output(SetUserThemeUseCaseOutputSchema)
    .mutation(handleUseCase(providers.SetUserTheme)),
});
