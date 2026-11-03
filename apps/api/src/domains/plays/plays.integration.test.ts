import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { DeletePlayUseCase } from "./delete-play.use-case.ts";
import { PlayNotFound, type UserPlaysRepository } from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests for happy paths of plays use cases.
 * The database layer is mocked, but the use case logic is real.
 */
describe("Plays endpoints - integration (happy paths)", () => {
  let playsRepository: vi.Mocked<UserPlaysRepository>;
  let useCase: DeletePlayUseCase;

  beforeEach(() => {
    playsRepository = {
      deletePlay: vi.fn(),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    const userContextService = {
      get: () => ({ userId: 1 }),
    } as unknown as UserContextService;
    useCase = new DeletePlayUseCase(userContextService, playsRepository);
  });

  it("deletePlay happy path returns success", async () => {
    playsRepository.deletePlay.mockResolvedValue(Result.ok(undefined));

    const result = await useCase.execute({ uri: "550e8400-e29b-41d4-a716-446655440000" });

    expect(result.isOk()).toBe(true);
    expect(playsRepository.deletePlay).toHaveBeenCalledWith({
      uri: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("deletePlay not-found surfaces as a typed 404 failure", async () => {
    playsRepository.deletePlay.mockResolvedValue(Result.failure(new PlayNotFound()));

    const result = await useCase.execute({ uri: "unknown" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(result.errorOrThrow().httpStatus()).toBe(404);
  });
});
