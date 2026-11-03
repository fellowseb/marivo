import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { ListAllGenresUseCase } from "./list-all-genres.use-case.ts";
import { ListAllPeriodsUseCase } from "./list-all-periods.use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

describe("ListAllGenresUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: ListAllGenresUseCase;

  beforeEach(() => {
    repository = {
      findAllGenres: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new ListAllGenresUseCase(repository);
  });

  it("returns all genre keys", async () => {
    repository.findAllGenres.mockResolvedValue(
      Result.ok([{ get: () => "drama" }, { get: () => "comedy" }] as never),
    );

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ genres: ["drama", "comedy"] });
  });

  it("propagates repository failures as Result.failure", async () => {
    repository.findAllGenres.mockResolvedValue(Result.failure(new Error("db down") as never));

    const result = await useCase.execute();

    expect(result.isFailure()).toBe(true);
  });
});

describe("ListAllPeriodsUseCase", () => {
  let repository: vi.Mocked<PlaysCollectionRepository>;
  let useCase: ListAllPeriodsUseCase;

  beforeEach(() => {
    repository = {
      findAllPeriods: vi.fn(),
    } as unknown as vi.Mocked<PlaysCollectionRepository>;
    useCase = new ListAllPeriodsUseCase(repository);
  });

  it("returns all period keys", async () => {
    repository.findAllPeriods.mockResolvedValue(
      Result.ok([{ get: () => "renaissance" }, { get: () => "modern" }] as never),
    );

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow()).toEqual({ periods: ["renaissance", "modern"] });
  });

  it("propagates repository failures as Result.failure", async () => {
    repository.findAllPeriods.mockResolvedValue(Result.failure(new Error("db down") as never));

    const result = await useCase.execute();

    expect(result.isFailure()).toBe(true);
  });
});
