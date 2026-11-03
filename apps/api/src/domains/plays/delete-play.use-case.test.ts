import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@marivo/utils";
import { DeletePlayUseCase } from "./delete-play.use-case.ts";
import { PlayNotFound, type UserPlaysRepository } from "./user-plays.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

function mockUserService(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("DeletePlayUseCase", () => {
  let playsRepository: vi.Mocked<UserPlaysRepository>;
  let useCase: DeletePlayUseCase;

  beforeEach(() => {
    playsRepository = {
      deletePlay: vi.fn(),
    } as unknown as vi.Mocked<UserPlaysRepository>;
    useCase = new DeletePlayUseCase(mockUserService(), playsRepository);
  });

  it("returns ok when the play is deleted", async () => {
    playsRepository.deletePlay.mockResolvedValue(Result.ok(undefined));

    const result = await useCase.execute({ uri: "some-uri" });

    expect(result.isOk()).toBe(true);
  });

  it("returns a failure Result instead of throwing when the play is not found", async () => {
    playsRepository.deletePlay.mockResolvedValue(Result.failure(new PlayNotFound()));

    const result = await useCase.execute({ uri: "unknown-uri" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(PlayNotFound);
    expect(result.errorOrThrow().httpStatus()).toBe(404);
  });
});
