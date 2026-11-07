import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result, type LanguageValue, type ThemeValue } from "@marivo/utils";
import { GetUserThemeUseCase } from "./get-user-theme.use-case.ts";
import { SetUserThemeUseCase } from "./set-user-theme.use-case.ts";
import { GetUserLanguageUseCase } from "./get-user-language.use-case.ts";
import { SetUserLanguageUseCase } from "./set-user-language.use-case.ts";
import type { UserPreferencesRepository } from "./user-preferences.repository.ts";
import { UserNotFound } from "./user-preferences.repository.ts";
import type { UserContextService } from "../../shared/use-case.ts";

function makeUserContext(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("GetUserThemeUseCase", () => {
  let repository: vi.Mocked<UserPreferencesRepository>;

  beforeEach(() => {
    repository = {
      getTheme: vi.fn().mockResolvedValue(Result.ok("sable-light" as ThemeValue)),
      setTheme: vi.fn(),
    } as unknown as vi.Mocked<UserPreferencesRepository>;
  });

  it("returns the user's stored theme", async () => {
    repository.getTheme = vi.fn().mockResolvedValue(Result.ok("foret-dark" as ThemeValue));
    const useCase = new GetUserThemeUseCase(repository, makeUserContext());

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().theme).toBe("foret-dark");
    expect(repository.getTheme).toHaveBeenCalledTimes(1);
  });

  it("fails when the user does not exist", async () => {
    repository.getTheme = vi.fn().mockResolvedValue(Result.failure(new UserNotFound()));
    const useCase = new GetUserThemeUseCase(repository, makeUserContext());

    const result = await useCase.execute();

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});

describe("SetUserThemeUseCase", () => {
  let repository: vi.Mocked<UserPreferencesRepository>;

  beforeEach(() => {
    repository = {
      getTheme: vi.fn(),
      setTheme: vi.fn().mockResolvedValue(Result.ok("ocean-light" as ThemeValue)),
    } as unknown as vi.Mocked<UserPreferencesRepository>;
  });

  it("stores the requested theme and returns it", async () => {
    const useCase = new SetUserThemeUseCase(repository, makeUserContext());

    const result = await useCase.execute({ theme: "ocean-light" });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().theme).toBe("ocean-light");
    expect(repository.setTheme).toHaveBeenCalledWith("ocean-light");
  });

  it("fails when the user does not exist", async () => {
    repository.setTheme = vi.fn().mockResolvedValue(Result.failure(new UserNotFound()));
    const useCase = new SetUserThemeUseCase(repository, makeUserContext());

    const result = await useCase.execute({ theme: "sable-dark" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(repository.setTheme).toHaveBeenCalledWith("sable-dark");
  });
});

describe("GetUserLanguageUseCase", () => {
  let repository: vi.Mocked<UserPreferencesRepository>;

  beforeEach(() => {
    repository = {
      getTheme: vi.fn(),
      setTheme: vi.fn(),
      getLanguage: vi.fn().mockResolvedValue(Result.ok("auto" as LanguageValue)),
      setLanguage: vi.fn(),
    } as unknown as vi.Mocked<UserPreferencesRepository>;
  });

  it("returns the user's stored language", async () => {
    repository.getLanguage = vi.fn().mockResolvedValue(Result.ok("fr" as LanguageValue));
    const useCase = new GetUserLanguageUseCase(repository, makeUserContext());

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().language).toBe("fr");
    expect(repository.getLanguage).toHaveBeenCalledTimes(1);
  });

  it("fails when the user does not exist", async () => {
    repository.getLanguage = vi.fn().mockResolvedValue(Result.failure(new UserNotFound()));
    const useCase = new GetUserLanguageUseCase(repository, makeUserContext());

    const result = await useCase.execute();

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});

describe("SetUserLanguageUseCase", () => {
  let repository: vi.Mocked<UserPreferencesRepository>;

  beforeEach(() => {
    repository = {
      getTheme: vi.fn(),
      setTheme: vi.fn(),
      getLanguage: vi.fn(),
      setLanguage: vi.fn().mockResolvedValue(Result.ok("fr" as LanguageValue)),
    } as unknown as vi.Mocked<UserPreferencesRepository>;
  });

  it("stores the requested language and returns it", async () => {
    const useCase = new SetUserLanguageUseCase(repository, makeUserContext());

    const result = await useCase.execute({ language: "fr" });

    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().language).toBe("fr");
    expect(repository.setLanguage).toHaveBeenCalledWith("fr");
  });

  it("fails when the user does not exist", async () => {
    repository.setLanguage = vi.fn().mockResolvedValue(Result.failure(new UserNotFound()));
    const useCase = new SetUserLanguageUseCase(repository, makeUserContext());

    const result = await useCase.execute({ language: "auto" });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
    expect(repository.setLanguage).toHaveBeenCalledWith("auto");
  });
});
