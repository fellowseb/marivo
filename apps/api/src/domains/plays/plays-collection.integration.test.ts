import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { ListAllGenresUseCase } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCase } from "./list-all-periods.use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

/**
 * Integration tests for happy paths of the playsCollection worker endpoints
 * (worker/playsCollection.listAllGenres and worker/playsCollection.listAllPeriods).
 * The database layer is mocked, but the use case logic is real.
 */
describe("playsCollection list endpoints - integration (happy paths)", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;

  beforeEach(() => {
    repository = {
      findAllGenres: vi.fn(),
      findAllPeriods: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
  });

  it("listAllGenres returns the genres array shape the worker expects", async () => {
    repository.findAllGenres.mockResolvedValue(
      Result.ok([{ get: () => "tragedy" }, { get: () => "drama" }] as never),
    );

    const result = await new ListAllGenresUseCase(repository).execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ genres: ["tragedy", "drama"] });
  });

  it("listAllPeriods returns the periods array shape the worker expects", async () => {
    repository.findAllPeriods.mockResolvedValue(
      Result.ok([{ get: () => "antiquity" }, { get: () => "modern" }] as never),
    );

    const result = await new ListAllPeriodsUseCase(repository).execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ periods: ["antiquity", "modern"] });
  });
});
