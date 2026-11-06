import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import type { Role } from "@marivo/utils";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { ScriptImportsRepository } from "./script-imports.repository.ts";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for publishing an
 * import's script into the public domain collection: capability guard, insert,
 * duplicate rejection, import marked done, and visibility in the listing.
 */
describe("playsCollection addToCollection (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  let scriptId: number;
  const importId = "10000000-0000-4000-8000-0000000000aa";

  function userContext(role?: Role): UserContextService {
    return { get: () => ({ userId, role }) } as unknown as UserContextService;
  }

  function makeUseCase(role?: Role) {
    const ctx = userContext(role);
    return new AddPlayToCollectionUseCase(
      new PlaysCollectionRepository(sql, ctx),
      new ScriptImportsRepository(sql, ctx),
      ctx,
    );
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    await sql`INSERT INTO theatrical_genres (key) VALUES ('comedy') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO theatrical_periods (key) VALUES ('xviiith') ON CONFLICT DO NOTHING`;
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_clerk_id', 'ituser', 'IT User', 'it@example.com')
      RETURNING id
    `;
    userId = user.id;
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('cafebabe', '{}'::jsonb, ARRAY[gen_random_uuid()])
      RETURNING id
    `;
    scriptId = script.id;
    await sql`
      INSERT INTO script_imports (id, status, files, result_script_id, user_id)
      VALUES (${importId}, 'reviewing', '{}'::jsonb, ${scriptId}, ${userId})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  const input = {
    importId,
    title: "Tartuffe",
    author: "Molière",
    lang: "fr" as const,
    numberOfRoles: 9,
    numberOfMaleRoles: 6,
    numberOfFemaleRoles: 3,
    genre: "comedy",
    period: "xviiith",
    synopsis: "Un faux dévot s'invite chez Orgon.",
  };

  it("rejects users without the create_collection_play capability", async () => {
    const result = await makeUseCase(undefined).execute(input);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("FORBIDDEN");

    const [row] = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM public_domain_plays
    `;
    expect(Number(row.count)).toBe(0);
  });

  it("publishes the import's script into public_domain_plays, marks the import done, and it appears in listAll (role: admin)", async () => {
    const result = await makeUseCase("admin").execute(input);
    expect(result.isOk()).toBe(true);
    const collectionUri = result.dataOrThrow().uri;
    expect(collectionUri).toHaveLength(36);

    const [row] = await sql<
      {
        title: string;
        author: string;
        lang: string;
        genre: string;
        script_id: number;
      }[]
    >`
      SELECT title, author, lang, genre, script_id FROM public_domain_plays WHERE uri = ${collectionUri}
    `;
    expect(row.title).toBe("Tartuffe");
    expect(row.author).toBe("Molière");
    expect(row.lang).toBe("fr");
    expect(row.genre).toBe("comedy");
    expect(row.script_id).toBe(scriptId);

    // the import is consumed: no personal play, import marked done
    const [playCount] = await sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM plays`;
    expect(Number(playCount.count)).toBe(0);
    const [importRow] = await sql<{ status: string }[]>`
      SELECT status FROM script_imports WHERE id = ${importId}
    `;
    expect(importRow.status).toBe("done");

    // visible in the collection listing
    const ctx = userContext("admin");
    const listUseCase = new ListAllScriptsUseCase(new PlaysCollectionRepository(sql, ctx), ctx);
    const list = await listUseCase.execute({ filters: {}, page: 1, pageSize: 20 });
    expect(list.isOk()).toBe(true);
    const scripts = list.dataOrThrow().scripts;
    expect(scripts.some((s) => s.uri === collectionUri && s.title === "Tartuffe")).toBe(true);
  });

  it("rejects publishing the same script twice", async () => {
    const result = await makeUseCase("collection-maintainer").execute(input);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });

  it("rejects unknown import ids with the ScriptImportNotFound error", async () => {
    const result = await makeUseCase("admin").execute({
      ...input,
      importId: "10000000-0000-4000-8000-0000000000ff",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });
});
