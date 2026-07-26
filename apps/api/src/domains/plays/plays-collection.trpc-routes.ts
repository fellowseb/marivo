import { publicProcedure, router } from '../../trpc.ts';
import { handleUseCase } from '../../shared/trpc-delivery.ts';
import { providers } from './plays-collection.providers.ts';
import { GetMetadataUseCaseOutputSchema } from './get-metadata.use-case.ts';

export default router({
  getMetadata: publicProcedure
    .output(GetMetadataUseCaseOutputSchema)
    .query(handleUseCase(providers.GetMetadata)),
});
