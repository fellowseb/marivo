import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;

function makeRecord(values: Record<string, unknown>) {
  return { get: (key: string) => values[key] };
}

describe("ListAllScriptsUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: ListAllScriptsUseCase;

  beforeEach(() => {
    repository = {
      findAllScripts: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new ListAllScriptsUseCase(repository, userContext);
  });

  it("maps collection records to the output shape with pagination info", async () => {
    repository.findAllScripts.mockResolvedValue(
      Result.ok({
        records: [
          makeRecord({
            uri: "99999999-9999-4999-8999-999999999999",
            title: "Le Jeu de l'amour et du hasard",
            author: "Pierre de Marivaux",
            lang: "fr",
            genre: "comedy",
            period: "xviiith",
            synopsis: "A synopsis",
            number_of_roles: 2,
            number_of_male_roles: 1,
            number_of_female_roles: 1,
            number_of_words: 5,
            characters: { "11111111-1111-4111-8111-111111111111": "ALICE" },
            bookmarked: true,
            archived: false,
          }),
        ],
        total: 54,
      } as never),
    );

    const result = await useCase.execute({ filters: { author: "Marivaux" }, page: 2, pageSize: 20 });

    expect(result.isOk()).toBe(true);
    expect(repository.findAllScripts).toHaveBeenCalledWith({
      filters: { author: "Marivaux" },
      page: 2,
      pageSize: 20,
      includeArchived: false,
    });
    const output = result.dataOrThrow();
    expect(output.total).toBe(54);
    expect(output.page).toBe(2);
    expect(output.pageSize).toBe(20);
    expect(output.scripts[0]).toMatchObject({
      uri: "99999999-9999-4999-8999-999999999999",
      title: "Le Jeu de l'amour et du hasard",
      author: "Pierre de Marivaux",
      numberOfWords: 5,
      bookmarked: true,
      archived: false,
    });
  });

  it("includes archived plays for users with the edit_collection_play_metadata capability", async () => {
    const maintainerContext = {
      get: () => ({ userId: 1, role: "collection-maintainer" as const }),
    } as unknown as UserContextService;
    const maintainerUseCase = new ListAllScriptsUseCase(repository, maintainerContext);
    repository.findAllScripts.mockResolvedValue(Result.ok({ records: [], total: 0 }));

    await maintainerUseCase.execute({ filters: { archivedOnly: true }, page: 1, pageSize: 20 });

    expect(repository.findAllScripts).toHaveBeenCalledWith({
      filters: { archivedOnly: true },
      page: 1,
      pageSize: 20,
      includeArchived: true,
    });
  });

  it("propagates repository failures as Result.failure", async () => {
    repository.findAllScripts.mockResolvedValue(Result.failure(new Error("db down") as never));

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.isFailure()).toBe(true);
  });
});
