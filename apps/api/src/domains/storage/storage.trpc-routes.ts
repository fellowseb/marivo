import { publicProcedure, router } from "../../trpc.ts";
import { handleUseCase } from "../../shared/trpc-delivery.ts";
import { providers } from "./storage.providers.ts";
import {
  GetPresignedUrlUseCaseInputSchema,
  GetPresignedUrlUseCaseOutputSchema,
} from "./get-presigned-url.use-case.ts";

export default router({
  getPresignedUrl: publicProcedure
    .input(GetPresignedUrlUseCaseInputSchema)
    .output(GetPresignedUrlUseCaseOutputSchema)
    .query(handleUseCase(providers.GetPresignedUrl)),
});
