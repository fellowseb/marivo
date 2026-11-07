import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { PostgresUserPreferencesRepository } from "./user-preferences.repository.ts";
import { GetUserThemeUseCase } from "./get-user-theme.use-case.ts";
import { SetUserThemeUseCase } from "./set-user-theme.use-case.ts";
import { GetUserLanguageUseCase } from "./get-user-language.use-case.ts";
import { SetUserLanguageUseCase } from "./set-user-language.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for the per-user
 * theme preference: default value, update, read-back and unknown user.
 */
describe("userPreferences theme (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;

  function makeUseCases() {
    const ctx = { get: () => ({ userId }) } as unknown as UserContextService;
    const repository = new PostgresUserPreferencesRepository(sql, ctx);
    return {
      get: new GetUserThemeUseCase(repository, ctx),
      set: new SetUserThemeUseCase(repository, ctx),
    };
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_prefs_clerk_id', 'prefsuser', 'Prefs User', 'prefs@example.com')
      RETURNING id
    `;
    userId = user.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("returns the default theme for a new user", async () => {
    const result = await makeUseCases().get.execute();
    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().theme).toBe("sable-light");
  });

  it("stores a theme and reads it back", async () => {
    const { get, set } = makeUseCases();
    const setResult = await set.execute({ theme: "foret-dark" });
    expect(setResult.isOk()).toBe(true);
    expect(setResult.dataOrThrow().theme).toBe("foret-dark");

    const getResult = await get.execute();
    expect(getResult.isOk()).toBe(true);
    expect(getResult.dataOrThrow().theme).toBe("foret-dark");
  });

  it("overwrites a previously stored theme", async () => {
    const { get, set } = makeUseCases();
    await set.execute({ theme: "ocean-light" });
    await set.execute({ theme: "ocean-dark" });

    const getResult = await get.execute();
    expect(getResult.dataOrThrow().theme).toBe("ocean-dark");

    const [row] = await sql<{ theme: string }[]>`
      SELECT theme FROM users WHERE id = ${userId}
    `;
    expect(row.theme).toBe("ocean-dark");
  });

  it("fails for a user that does not exist", async () => {
    const ctx = { get: () => ({ userId: 999999999 }) } as unknown as UserContextService;
    const repository = new PostgresUserPreferencesRepository(sql, ctx);
    const result = await new GetUserThemeUseCase(repository, ctx).execute();
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");

    const setResult = await new SetUserThemeUseCase(repository, ctx).execute({
      theme: "sable-dark",
    });
    expect(setResult.isFailure()).toBe(true);
    expect(setResult.errorOrThrow().code).toBe("NOT_FOUND");
  });

  function makeLanguageUseCases() {
    const ctx = { get: () => ({ userId }) } as unknown as UserContextService;
    const repository = new PostgresUserPreferencesRepository(sql, ctx);
    return {
      get: new GetUserLanguageUseCase(repository, ctx),
      set: new SetUserLanguageUseCase(repository, ctx),
    };
  }

  it("language: returns the default 'auto' for a new user", async () => {
    const result = await makeLanguageUseCases().get.execute();
    expect(result.isOk()).toBe(true);
    expect(result.dataOrThrow().language).toBe("auto");
  });

  it("language: stores a language and reads it back", async () => {
    const { get, set } = makeLanguageUseCases();
    const setResult = await set.execute({ language: "fr" });
    expect(setResult.isOk()).toBe(true);
    expect(setResult.dataOrThrow().language).toBe("fr");

    const getResult = await get.execute();
    expect(getResult.isOk()).toBe(true);
    expect(getResult.dataOrThrow().language).toBe("fr");

    const [row] = await sql<{ language: string }[]>`
      SELECT language FROM users WHERE id = ${userId}
    `;
    expect(row.language).toBe("fr");
  });

  it("language: overwrites a previously stored language (back to auto)", async () => {
    const { get, set } = makeLanguageUseCases();
    await set.execute({ language: "en" });
    await set.execute({ language: "auto" });

    const getResult = await get.execute();
    expect(getResult.dataOrThrow().language).toBe("auto");
  });

  it("language: fails for a user that does not exist", async () => {
    const ctx = { get: () => ({ userId: 999999999 }) } as unknown as UserContextService;
    const repository = new PostgresUserPreferencesRepository(sql, ctx);
    const result = await new GetUserLanguageUseCase(repository, ctx).execute();
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");

    const setResult = await new SetUserLanguageUseCase(repository, ctx).execute({
      language: "fr",
    });
    expect(setResult.isFailure()).toBe(true);
    expect(setResult.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
