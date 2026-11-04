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
 * Integration tests (real Postgres via testcontainers) for the collection
 * listing: metadata, characters, computed word count, server-side filters,
 * pagination and bookmarks.
 */
describe("playsCollection listAll (integration with real Postgres)", () => {
  let sql: Sql;
  let repository: PlaysCollectionRepository;
  let userId: number;
  const uris: Record<string, string> = {};

  beforeAll(async () => {
    sql = await setupTestDatabase();
    // reference data (fixtures.sql is not applied to the test DB)
    await sql`INSERT INTO theatrical_genres (key) VALUES ('comedy'), ('tragedy') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO theatrical_periods (key) VALUES ('contemporary'), ('elizabethan') ON CONFLICT DO NOTHING`;
    userId = await createTestUser(sql);
    const userContext = { get: () => ({ userId }) } as unknown as UserContextService;
    repository = new PlaysCollectionRepository(sql, userContext);

    const plays = [
      { key: "hamlet", uri: "10000000-0000-4000-8000-000000000001", title: "Hamlet", author: "William Shakespeare", lang: "en", genre: "tragedy", period: "elizabethan", words: ["To be or not to be", "that is the question"] },
      { key: "macbeth", uri: "10000000-0000-4000-8000-000000000002", title: "Macbeth", author: "William Shakespeare", lang: "en", genre: "tragedy", period: "elizabethan", words: ["Out damned spot"] },
      { key: "jeu", uri: "10000000-0000-4000-8000-000000000003", title: "Le Jeu de l'amour et du hasard", author: "Pierre de Marivaux", lang: "fr", genre: "comedy", period: "contemporary", words: ["Un valet", "et sa maîtresse"] },
    ];
    for (const play of plays) {
      const [script] = await sql<{ id: number }[]>`
        INSERT INTO scripts (checksum, characters, lines_order)
        VALUES ('deadbeef', '{"11111111-1111-4111-8111-111111111111": "HERO"}'::jsonb, ARRAY[gen_random_uuid(), gen_random_uuid()])
        RETURNING id
      `;
      const [head] = await sql<{ head: string }[]>`
        INSERT INTO lines (id, script_id, type) VALUES (gen_random_uuid(), ${script.id}, 'heading') RETURNING id AS head
      `;
      const [text] = await sql<{ text: string }[]>`
        INSERT INTO lines (id, script_id, type) VALUES (gen_random_uuid(), ${script.id}, 'chartext') RETURNING id AS text
      `;
      await sql`
        INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
        VALUES (gen_random_uuid(), ${script.id}, 'saved_version', ${head.head}, 'heading', 1, ${play.title}, 'aaaa', 1, ${userId})
      `;
      await sql`
        INSERT INTO lines_contents (id, script_id, type, line_id, line_type, characters, text, checksum, version, author_id)
        VALUES (gen_random_uuid(), ${script.id}, 'saved_version', ${text.text}, 'chartext', '{11111111-1111-4111-8111-111111111111}', ${play.words.join(" ")}, 'bbbb', 1, ${userId})
      `;
      await sql`
        UPDATE scripts SET lines_order = ARRAY[${head.head}, ${text.text}]::uuid[] WHERE id = ${script.id}
      `;
      await sql`
        INSERT INTO public_domain_plays (uri, title, author, lang, number_of_roles, number_of_male_roles, number_of_female_roles, genre, period, synopsis, script_id)
        VALUES (${play.uri}, ${play.title}, ${play.author}, ${play.lang}, 3, 2, 1, ${play.genre}, ${play.period}, ${"Synopsis of " + play.title}, ${script.id})
      `;
      uris[play.key] = play.uri;
    }
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("returns a page with metadata, characters, word count and bookmark flag", async () => {
    const result = await repository.findAllScripts({ filters: {}, page: 1, pageSize: 20 });

    expect(result.isOk()).toBe(true);
    const { records, total } = result.dataOrThrow();
    expect(total).toBe(3);
    expect(records).toHaveLength(3);
    const hamlet = records.find((r) => r.get("title") === "Hamlet");
    expect(hamlet?.get("author")).toBe("William Shakespeare");
    expect(hamlet?.get("number_of_words")).toBe(11); // "Hamlet" (1) + 10 words
    expect(hamlet?.get("characters")).toEqual({ "11111111-1111-4111-8111-111111111111": "HERO" });
    expect(hamlet?.get("bookmarked")).toBe(false);
  });

  it("paginates server-side", async () => {
    const page1 = await repository.findAllScripts({ filters: {}, page: 1, pageSize: 2 });
    const page2 = await repository.findAllScripts({ filters: {}, page: 2, pageSize: 2 });

    expect(page1.dataOrThrow().records).toHaveLength(2);
    expect(page1.dataOrThrow().total).toBe(3);
    expect(page2.dataOrThrow().records).toHaveLength(1);
    const page1Uris = page1.dataOrThrow().records.map((r) => r.get("uri"));
    const page2Uris = page2.dataOrThrow().records.map((r) => r.get("uri"));
    expect(page1Uris.filter((u) => page2Uris.includes(u))).toHaveLength(0);
  });

  it("filters by title substring, case-insensitive", async () => {
    const result = await repository.findAllScripts({
      filters: { title: "HAMLET" },
      page: 1,
      pageSize: 20,
    });
    expect(result.dataOrThrow().total).toBe(1);
    expect(result.dataOrThrow().records[0].get("title")).toBe("Hamlet");
  });

  it("filters by author, language, genre and period", async () => {
    const byAuthor = await repository.findAllScripts({
      filters: { author: "shakespeare" },
      page: 1,
      pageSize: 20,
    });
    expect(byAuthor.dataOrThrow().total).toBe(2);

    const byLangGenre = await repository.findAllScripts({
      filters: { languages: ["fr"], genres: ["comedy"], periods: ["contemporary"] },
      page: 1,
      pageSize: 20,
    });
    expect(byLangGenre.dataOrThrow().total).toBe(1);
    expect(byLangGenre.dataOrThrow().records[0].get("author")).toBe("Pierre de Marivaux");
  });

  it("filters by minimum roles", async () => {
    const result = await repository.findAllScripts({
      filters: { minRoles: 3 },
      page: 1,
      pageSize: 20,
    });
    expect(result.dataOrThrow().total).toBe(3);
  });

  it("toggles a bookmark and filters by bookmarkedOnly", async () => {
    const first = await repository.toggleBookmark({ playUri: uris.hamlet });
    expect(first.dataOrThrow()).toEqual({ bookmarked: true });

    const listed = await repository.findAllScripts({ filters: {}, page: 1, pageSize: 20 });
    const hamlet = listed.dataOrThrow().records.find((r) => r.get("uri") === uris.hamlet);
    expect(hamlet?.get("bookmarked")).toBe(true);

    const onlyBookmarked = await repository.findAllScripts({
      filters: { bookmarkedOnly: true },
      page: 1,
      pageSize: 20,
    });
    expect(onlyBookmarked.dataOrThrow().total).toBe(1);
    expect(onlyBookmarked.dataOrThrow().records[0].get("title")).toBe("Hamlet");

    const second = await repository.toggleBookmark({ playUri: uris.hamlet });
    expect(second.dataOrThrow()).toEqual({ bookmarked: false });
    const after = await repository.findAllScripts({
      filters: { bookmarkedOnly: true },
      page: 1,
      pageSize: 20,
    });
    expect(after.dataOrThrow().total).toBe(0);
  });

  it("toggleBookmark fails with CollectionPlayNotFound for unknown uri", async () => {
    const result = await repository.toggleBookmark({ playUri: "00000000-0000-4000-8000-000000000000" });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow()).toBeInstanceOf(CollectionPlayNotFound);
  });

  it("getScriptIdByUri resolves the script and fails with CollectionPlayNotFound when unknown", async () => {
    const ok = await repository.getScriptIdByUri({ uri: uris.hamlet });
    expect(ok.isOk()).toBe(true);

    const missing = await repository.getScriptIdByUri({ uri: "00000000-0000-4000-8000-000000000000" });
    expect(missing.isFailure()).toBe(true);
    expect(missing.errorOrThrow()).toBeInstanceOf(CollectionPlayNotFound);
  });

  it("ListAllScriptsUseCase happy path returns the mapped paginated output", async () => {
    const userContext = { get: () => ({ userId }) } as unknown as UserContextService;
    const useCase = new ListAllScriptsUseCase(repository, userContext);

    const result = await useCase.execute({ filters: { genres: ["tragedy"] }, page: 1, pageSize: 10 });

    expect(result.isOk()).toBe(true);
    const output = result.dataOrThrow();
    expect(output.total).toBe(2);
    expect(output.scripts).toHaveLength(2);
    expect(output.scripts[0]).toMatchObject({
      author: "William Shakespeare",
      genre: "tragedy",
      bookmarked: false,
    });
    expect(Object.keys(output.scripts[0].characters)).toHaveLength(1);
  });
});
