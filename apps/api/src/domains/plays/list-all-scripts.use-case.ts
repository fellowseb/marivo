import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

export const ListAllScriptsUseCaseOutputSchema = z.object({
  scripts: z.array(
    z.object({
      uri: z.string(),
      title: z.string(),
      author: z.string(),
      lang: z.string(),
      genre: z.string().nullable(),
      period: z.string().nullable(),
      synopsis: z.string().nullable(),
      numberOfRoles: z.number().nullable(),
      numberOfMaleRoles: z.number().nullable(),
      numberOfFemaleRoles: z.number().nullable(),
      numberOfWords: z.number(),
      characters: z.record(z.string(), z.string()),
    }),
  ),
});

type ListAllScriptsUseCaseOutput = z.infer<typeof ListAllScriptsUseCaseOutputSchema>;

export class ListAllScriptsUseCase extends AuthenticatedUseCase<{
  success: ListAllScriptsUseCaseOutput;
}> {
  constructor(repository: PlaysCollectionRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute() {
    const result = await this.repository.findAllScripts();
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({
      scripts: result.dataOrThrow().map((record) => ({
        uri: record.get("uri"),
        title: record.get("title"),
        author: record.get("author"),
        lang: record.get("lang"),
        genre: record.get("genre"),
        period: record.get("period"),
        synopsis: record.get("synopsis"),
        numberOfRoles: record.get("number_of_roles"),
        numberOfMaleRoles: record.get("number_of_male_roles"),
        numberOfFemaleRoles: record.get("number_of_female_roles"),
        numberOfWords: record.get("number_of_words"),
        characters: record.get("characters"),
      })),
    });
  }

  private repository: PlaysCollectionRepository;
}
