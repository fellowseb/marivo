import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase, createTestUser } from "../../test-utils/db.ts";
import type { Sql } from "postgres";
import {
  PlaysCollectionRepository,
  CollectionPlayNotFound,
} from "./plays-collection.repository.ts";
import { ListAllScriptsUseCase } from "./list-all-scripts.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration test (real Postgres via testcontainers) for the collection
 * listing: metadata, characters and the computed word count.
 */
describe("playsCollection listAll (integration with real Postgres)", () => {
  let sql: Sql;
  let repository: PlaysCollectionRepository;
  const collectionUri = "99999999-9999-4999-8999-999999999999";

  beforeAll(async () => {
    sql = await setupTestDatabase();
    // reference data (fixtures.sql is not applied to the test DB)
    await sql`INSERT INTO theatrical_genres (key) VALUES ('comedy') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO theatrical_periods (key) VALUES ('contemporary') ON CONFLICT DO NOTHING`;
    const userId = await createTestUser(sql);
    const userContext = { get: () => ({ userId }) } as unknown as UserContextService;
    repository = new PlaysCollectionRepository(sql, userContext);

    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters)
      VALUES (
        '9f2c1a77e4b34d0aa1c2e5f60718293b',
        '{"11111111-1111-4111-8111-111111111111": "ALICE", "22222222-2222-4222-8222-222222222222": "BOB"}'::jsonb
      )
      RETURNING id
    `;
    await sql`
      INSERT INTO lines (id, script_id, type)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ${script.id}, 'heading')
    `;
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', ${script.id}, 'saved_version', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'heading', 1, 'Act One', 'cccc', 1, ${userId})
    `;
    await sql`
      INSERT INTO lines (id, script_id, type)
      VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', ${script.id}, 'chartext')
    `;
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, characters, text, checksum, version, author_id)
      VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', ${script.id}, 'saved_version', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'chartext', '{11111111-1111-4111-8111-111111111111}', 'Hello brave new world', 'ffff', 1, ${userId})
    `;
    await sql`
      INSERT INTO public_domain_plays (uri, title, author, lang, number_of_roles, number_of_male_roles, number_of_female_roles, genre, period, synopsis, script_id)
      VALUES (${collectionUri}, 'The Fixture Play', 'Fixture Author', 'en', 2, 1, 1, 'comedy', 'contemporary', 'A small synopsis.', ${script.id})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("findAllScripts returns metadata, characters and computed word count", async () => {
    const result = await repository.findAllScripts();

    expect(result.isOk()).toBe(true);
    const scripts = result.dataOrThrow();
    expect(scripts).toHaveLength(1);
    const record = scripts[0];
    expect(record.get("uri")).toBe(collectionUri);
    expect(record.get("title")).toBe("The Fixture Play");
    expect(record.get("author")).toBe("Fixture Author");
    expect(record.get("genre")).toBe("comedy");
    expect(record.get("synopsis")).toBe("A small synopsis.");
    expect(record.get("number_of_roles")).toBe(2);
    // "Act One" (2 words) + "Hello brave new world" (4 words)
    expect(record.get("number_of_words")).toBe(6);
    expect(record.get("characters")).toEqual({
      "11111111-1111-4111-8111-111111111111": "ALICE",
      "22222222-2222-4222-8222-222222222222": "BOB",
    });
  });

  it("getScriptIdByUri resolves the script and fails with CollectionPlayNotFound when unknown", async () => {
    const ok = await repository.getScriptIdByUri({ uri: collectionUri });
    expect(ok.isOk()).toBe(true);

    const missing = await repository.getScriptIdByUri({ uri: "00000000-0000-4000-8000-000000000000" });
    expect(missing.isFailure()).toBe(true);
    expect(missing.errorOrThrow()).toBeInstanceOf(CollectionPlayNotFound);
  });

  it("ListAllScriptsUseCase happy path returns the mapped output", async () => {
    const userContext = { get: () => ({ userId: 1 }) } as unknown as UserContextService;
    const useCase = new ListAllScriptsUseCase(repository, userContext);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    const { scripts } = result.dataOrThrow();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({
      uri: collectionUri,
      title: "The Fixture Play",
      author: "Fixture Author",
      lang: "en",
      genre: "comedy",
      period: "contemporary",
      synopsis: "A small synopsis.",
      numberOfRoles: 2,
      numberOfWords: 6,
    });
    expect(Object.values(scripts[0].characters)).toEqual(["ALICE", "BOB"]);
  });
});
