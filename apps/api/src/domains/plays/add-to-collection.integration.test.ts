import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import type { Role } from "@marivo/utils";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { UserPlaysRepository } from "./user-plays.repository.ts";
import { AddPlayToCollectionUseCase } from "./add-play-to-collection.use-case.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers) for publishing a play
 * into the public domain collection: capability guard, insert, duplicate
 * rejection and visibility in the collection listing.
 */
describe("playsCollection addToCollection (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  let playUri: string;
  let scriptId: number;

  function userContext(role?: Role): UserContextService {
    return { get: () => ({ userId, role }) } as unknown as UserContextService;
  }

  function makeUseCase(role?: Role) {
    const ctx = userContext(role);
    return new AddPlayToCollectionUseCase(
      new PlaysCollectionRepository(sql, ctx),
      new UserPlaysRepository(sql, ctx),
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
    playUri = "10000000-0000-4000-8000-0000000000aa";
    await sql`
      INSERT INTO plays (uri, title, created_date, creator_id, owner_id, last_modified_date, script_id)
      VALUES (${playUri}, 'Tartuffe', now(), ${userId}, ${userId}, now(), ${scriptId})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  const input = {
    playUri: "10000000-0000-4000-8000-0000000000aa",
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

  it("publishes the play into public_domain_plays and it appears in listAll (role: admin)", async () => {
    const result = await makeUseCase("admin").execute(input);
    expect(result.isOk()).toBe(true);
    const collectionUri = result.dataOrThrow().uri;
    expect(collectionUri).toHaveLength(36);

    const [row] = await sql<{
      title: string;
      author: string;
      lang: string;
      genre: string;
      script_id: number;
    }[]>`
      SELECT title, author, lang, genre, script_id FROM public_domain_plays WHERE uri = ${collectionUri}
    `;
    expect(row.title).toBe("Tartuffe");
    expect(row.author).toBe("Molière");
    expect(row.lang).toBe("fr");
    expect(row.genre).toBe("comedy");
    expect(row.script_id).toBe(scriptId);

    // visible in the collection listing
    const listUseCase = new ListAllScriptsUseCase(new PlaysCollectionRepository(sql, userContext("admin")), userContext("admin"));
    const list = await listUseCase.execute({ filters: {}, page: 1, pageSize: 20 });
    expect(list.isOk()).toBe(true);
    const scripts = list.dataOrThrow().scripts;
    expect(scripts.some((s) => s.uri === collectionUri && s.title === "Tartuffe")).toBe(true);
  });

  it("also works for the collection-maintainer role", async () => {
    const playUri2 = "10000000-0000-4000-8000-0000000000bb";
    // the second play needs its own script
    const [script2] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum) VALUES ('deadbeef2') RETURNING id
    `;
    await sql`
      INSERT INTO plays (uri, title, created_date, creator_id, owner_id, last_modified_date, script_id)
      VALUES (${playUri2}, 'Le Misanthrope', now(), ${userId}, ${userId}, now(), ${script2.id})
    `;

    const result = await makeUseCase("collection-maintainer").execute({
      ...input,
      playUri: playUri2,
      title: "Le Misanthrope",
    });
    expect(result.isOk()).toBe(true);
  });

  it("rejects publishing the same script twice", async () => {
    const result = await makeUseCase("admin").execute(input);
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });

  it("rejects unknown play uris with NOT_FOUND", async () => {
    const result = await makeUseCase("admin").execute({
      ...input,
      playUri: "10000000-0000-4000-8000-0000000000ff",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("NOT_FOUND");
  });
});
