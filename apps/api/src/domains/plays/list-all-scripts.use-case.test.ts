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

  it("maps collection records to the output shape", async () => {
    repository.findAllScripts.mockResolvedValue(
      Result.ok([
        makeRecord({
          uri: "99999999-9999-4999-8999-999999999999",
          title: "The Fixture Play",
          author: "Fixture Author",
          lang: "en",
          genre: "comedy",
          period: "contemporary",
          synopsis: "A synopsis",
          number_of_roles: 2,
          number_of_male_roles: 1,
          number_of_female_roles: 1,
          number_of_words: 5,
          characters: { "11111111-1111-4111-8111-111111111111": "ALICE" },
        }),
      ] as never),
    );

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({
      scripts: [
        {
          uri: "99999999-9999-4999-8999-999999999999",
          title: "The Fixture Play",
          author: "Fixture Author",
          lang: "en",
          genre: "comedy",
          period: "contemporary",
          synopsis: "A synopsis",
          numberOfRoles: 2,
          numberOfMaleRoles: 1,
          numberOfFemaleRoles: 1,
          numberOfWords: 5,
          characters: { "11111111-1111-4111-8111-111111111111": "ALICE" },
        },
      ],
    });
  });

  it("propagates repository failures as Result.failure", async () => {
    repository.findAllScripts.mockResolvedValue(Result.failure(new Error("db down") as never));

    const result = await useCase.execute();

    expect(result.isFailure()).toBe(true);
  });
});
