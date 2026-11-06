import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { setupTestDatabase, teardownTestDatabase } from "../../test-utils/db.ts";
import { UserPlaysRepository } from "./user-plays.repository.ts";
import { PlaysCollectionRepository } from "./plays-collection.repository.ts";
import { ScriptRepository } from "../script/script.repository.ts";
import CreatePlayFromCollectionUseCase from "./create-play-from-collection.use-case.ts";
import type { UserContextService } from "../../shared/use-case.ts";

/**
 * Integration tests (real Postgres via testcontainers): creating a play from
 * a collection play must COPY the script (latest saved version per line only;
 * shared drafts and per-user drafts dropped), so edits never leak between the
 * user's play and the collection play.
 */
describe("plays createPlayFromCollection (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  let scriptId: number;
  let line1Id: string;
  let line2Id: string;
  const collectionUri = "99999999-9999-4999-8999-999999999999";

  function userContext(): UserContextService {
    return { get: () => ({ userId }) } as unknown as UserContextService;
  }

  beforeAll(async () => {
    sql = await setupTestDatabase();
    await sql`INSERT INTO theatrical_genres (key) VALUES ('tragedy') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO theatrical_periods (key) VALUES ('renaissance') ON CONFLICT DO NOTHING`;
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('it_clerk_id', 'ituser', 'IT User', 'it@example.com')
      RETURNING id
    `;
    userId = user.id;
    const [script] = await sql<{ id: number }[]>`
      INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('deadbeef', '{}'::jsonb, ARRAY[gen_random_uuid(), gen_random_uuid()])
      RETURNING id
    `;
    scriptId = script.id;
    const [line1] = await sql<{ id: string }[]>`
      INSERT INTO lines (id, script_id, type) VALUES (gen_random_uuid(), ${scriptId}, 'heading') RETURNING id
    `;
    const [line2] = await sql<{ id: string }[]>`
      INSERT INTO lines (id, script_id, type) VALUES (gen_random_uuid(), ${scriptId}, 'chartext') RETURNING id
    `;
    line1Id = line1.id;
    line2Id = line2.id;
    await sql`UPDATE scripts SET lines_order = ARRAY[${line1Id}, ${line2Id}]::uuid[] WHERE id = ${scriptId}`;
    // line 1: two saved versions (v1 old, v2 latest) + a shared draft + a draft
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), ${scriptId}, 'saved_version', ${line1Id}, 'heading', 1, 'OLD TITLE', 'aaaa', 1, ${userId})
    `;
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), ${scriptId}, 'saved_version', ${line1Id}, 'heading', 2, 'NEW TITLE', 'aaab', 2, ${userId})
    `;
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), ${scriptId}, 'shared_draft', ${line1Id}, 'heading', 1, 'SHARED', 'cccc', 1, ${userId})
    `;
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), ${scriptId}, 'draft', ${line1Id}, 'heading', 1, 'PRIVATE DRAFT', 'dddd', NULL, ${userId})
    `;
    // line 2: single saved version
    await sql`
      INSERT INTO lines_contents (id, script_id, type, line_id, line_type, characters, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), ${scriptId}, 'saved_version', ${line2Id}, 'chartext', '{}', 'Hello world', 'bbbb', 1, ${userId})
    `;
    await sql`
      INSERT INTO public_domain_plays (uri, title, author, lang, number_of_roles, genre, period, synopsis, script_id)
      VALUES (${collectionUri}, 'Hamlet', 'Shakespeare', 'en', 1, 'tragedy', 'renaissance', 'A prince avenges his father.', ${scriptId})
    `;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("copies the script (latest saved version per line only) into a new play, leaving the original untouched", async () => {
    const ctx = userContext();
    const useCase = new CreatePlayFromCollectionUseCase(
      new UserPlaysRepository(sql, ctx),
      new PlaysCollectionRepository(sql, ctx),
      new ScriptRepository(sql, ctx),
      ctx,
    );

    const result = await useCase.execute({ title: "My Hamlet", collectionUri });

    expect(result.isOk()).toBe(true);
    const newUri = result.dataOrThrow().uri;

    const [newPlay] = await sql<{ script_id: number }[]>`
      SELECT script_id FROM plays WHERE uri = ${newUri}
    `;
    expect(newPlay).toBeTruthy();
    expect(newPlay.script_id).not.toBe(scriptId);

    // lines are copied with the same ids
    const copiedLines = await sql<{ id: string; script_id: number }[]>`
      SELECT id, script_id FROM lines WHERE script_id = ${newPlay.script_id} ORDER BY id
    `;
    expect(copiedLines.map((l) => l.id).sort()).toEqual([line1Id, line2Id].sort());

    // only the latest saved version per line is copied; no shared drafts / drafts
    const copiedContents = await sql<
      { line_id: string; type: string; version: number | null; text: string }[]
    >`
      SELECT line_id, type, version, text FROM lines_contents WHERE script_id = ${newPlay.script_id} ORDER BY line_id, version
    `;
    expect(copiedContents).toHaveLength(2);
    expect(copiedContents.every((c) => c.type === "saved_version")).toBe(true);
    const line1Content = copiedContents.find((c) => c.line_id === line1Id);
    expect(line1Content?.version).toBe(2);
    expect(line1Content?.text).toBe("NEW TITLE");
    const line2Content = copiedContents.find((c) => c.line_id === line2Id);
    expect(line2Content?.version).toBe(1);

    // the original collection script is unchanged
    const originalContents = await sql<{ type: string; version: number | null }[]>`
      SELECT type, version FROM lines_contents WHERE script_id = ${scriptId}
    `;
    expect(originalContents).toHaveLength(5);
    const [originalPlay] = await sql<{ script_id: number }[]>`
      SELECT script_id FROM public_domain_plays WHERE uri = ${collectionUri}
    `;
    expect(originalPlay.script_id).toBe(scriptId);
  });
});
