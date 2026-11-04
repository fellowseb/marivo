import z from "zod";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import type {
  CollectionPage,
  PlaysCollectionRepository,
} from "./plays-collection.repository.ts";

export const CollectionFiltersSchema = z
  .object({
    title: z.string().optional(),
    author: z.string().optional(),
    languages: z.array(z.string()).optional(),
    genres: z.array(z.string()).optional(),
    periods: z.array(z.string()).optional(),
    minRoles: z.number().int().min(0).optional(),
    maxRoles: z.number().int().min(0).optional(),
    minMaleRoles: z.number().int().min(0).optional(),
    maxMaleRoles: z.number().int().min(0).optional(),
    minFemaleRoles: z.number().int().min(0).optional(),
    maxFemaleRoles: z.number().int().min(0).optional(),
    bookmarkedOnly: z.boolean().optional(),
  })
  .optional();

export const ListAllScriptsUseCaseInputSchema = z.object({
  filters: CollectionFiltersSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const CollectionScriptSchema = z.object({
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
  bookmarked: z.boolean(),
});

export const ListAllScriptsUseCaseOutputSchema = z.object({
  scripts: z.array(CollectionScriptSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

type ListAllScriptsUseCaseInput = z.infer<typeof ListAllScriptsUseCaseInputSchema>;
type ListAllScriptsUseCaseOutput = z.infer<typeof ListAllScriptsUseCaseOutputSchema>;

export class ListAllScriptsUseCase extends AuthenticatedUseCase<{
  params: ListAllScriptsUseCaseInput;
  success: ListAllScriptsUseCaseOutput;
}> {
  constructor(repository: PlaysCollectionRepository, userContext: UserContextService) {
    super(userContext);
    this.repository = repository;
  }

  async execute(input: ListAllScriptsUseCaseInput) {
    const result = await this.repository.findAllScripts({
      filters: input.filters ?? {},
      page: input.page,
      pageSize: input.pageSize,
    } as CollectionPage);
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    const { records, total } = result.dataOrThrow();
    return Result.ok({
      scripts: records.map((record) => ({
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
        bookmarked: record.get("bookmarked"),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    });
  }

  private repository: PlaysCollectionRepository;
}
