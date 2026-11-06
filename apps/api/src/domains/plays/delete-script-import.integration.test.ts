import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { ScriptImportsRepository } from "./script-imports.repository.ts";
import { DeleteScriptImportUseCase } from "./delete-script-import.use-case.ts";
import { GetAllScriptImportsUseCase } from "./get-all-script-imports.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for deleting a script
 * import: happy path delete, user scoping (cannot delete another user's
 * import), and createdAt exposure in the listing.
 */
describe("plays deleteScriptImport (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  let otherUserId: number;
  const importId = "10000000-0000-4000-8000-0000000000aa";
  const otherImportId = "10000000-0000-4000-8000-0000000000bb";

  function userContext(id: number): UserContextService {
    return { get: () => ({ userId: id }) } as unknown as UserContextService;
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_clerk_id', 'ituser', 'IT User', 'it@example.com')
      RETURNING id
    `;
    userId = user.id;
    const [other] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_clerk_id_2', 'ituser2', 'IT User 2', 'it2@example.com')
      RETURNING id
    `;
    otherUserId = other.id;
    await sql`
      INSERT INTO script_imports (id, status, files, user_id)
      VALUES (${importId}, 'processing_files', '{}'::jsonb, ${userId})
    `;
    await sql`
      INSERT INTO script_imports (id, status, files, user_id)
      VALUES (${otherImportId}, 'processing_files', '{}'::jsonb, ${otherUserId})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("happy path: deletes the user's own import and it disappears from the listing", async () => {
    const ctx = userContext(userId);
    const useCase = new DeleteScriptImportUseCase(ctx, new ScriptImportsRepository(sql, ctx));

    const result = await useCase.execute({ importId });

    expect(result.isOk()).toBe(true);
    const listUseCase = new GetAllScriptImportsUseCase(ctx, new ScriptImportsRepository(sql, ctx));
    const list = (await listUseCase.execute()).dataOrThrow();
    expect(list.map((imp) => imp.id)).not.toContain(importId);
  });

  it("error case: cannot delete another user's import (not found for this user)", async () => {
    const ctx = userContext(userId);
    const useCase = new DeleteScriptImportUseCase(ctx, new ScriptImportsRepository(sql, ctx));

    const result = await useCase.execute({ importId: otherImportId });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().message).toBe("Script import not found");
    // the other user's import is untouched
    const otherCtx = userContext(otherUserId);
    const listUseCase = new GetAllScriptImportsUseCase(
      otherCtx,
      new ScriptImportsRepository(sql, otherCtx),
    );
    const list = (await listUseCase.execute()).dataOrThrow();
    expect(list.map((imp) => imp.id)).toContain(otherImportId);
  });

  it("listing exposes createdAt for each import", async () => {
    const ctx = userContext(otherUserId);
    const listUseCase = new GetAllScriptImportsUseCase(ctx, new ScriptImportsRepository(sql, ctx));
    const list = (await listUseCase.execute()).dataOrThrow();
    const imp = list.find((i) => i.id === otherImportId);
    expect(imp).toBeTruthy();
    expect(imp!.createdAt).toBeInstanceOf(Date);
  });

  it("listing exposes the script title for reviewing imports", async () => {
    const reviewingId = "10000000-0000-4000-8000-0000000000cc";
    await sql`
      INSERT INTO script_imports (id, status, files, result_metadata_title, user_id)
      VALUES (${reviewingId}, 'reviewing', '{}'::jsonb, 'Hamlet', ${otherUserId})
    `;
    const ctx = userContext(otherUserId);
    const listUseCase = new GetAllScriptImportsUseCase(ctx, new ScriptImportsRepository(sql, ctx));
    const list = (await listUseCase.execute()).dataOrThrow();
    const reviewing = list.find((i) => i.id === reviewingId);
    expect(reviewing).toBeTruthy();
    expect(reviewing!.status).toBe("reviewing");
    expect(reviewing!.title).toBe("Hamlet");
    const processing = list.find((i) => i.id === otherImportId);
    expect(processing!.title).toBeNull();
  });
});
