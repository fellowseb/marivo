import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Sql } from "postgres";
import { v4 as uuidv4 } from "uuid";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestScript,
} from "../../test-utils/db.ts";
import { ScriptRepository } from "./script.repository.ts";
import { UserContextService } from "../../shared/use-case.ts";

// Minimal mock of UserContextService
function mockUserService(userId: number): UserContextService {
  return {
    get: () => ({ userId }),
  } as unknown as UserContextService;
}

describe("ScriptRepository (integration with real Postgres)", () => {
  let sql: Sql;
  let userId: number;
  let scriptId: number;
  let repo: ScriptRepository;

  beforeAll(async () => {
    sql = await setupTestDatabase();
    userId = await createTestUser(sql);
    scriptId = await createTestScript(sql);
    // Use a transaction-wrapped sql for the repo (mimics handleUseCase)
    repo = new ScriptRepository(sql, mockUserService(userId));
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("saveLineContent inserts a row with a valid timestamp", async () => {
    const lineId = uuidv4();
    // Create the line first
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;

    const result = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "Hello world" },
      contentType: "saved_version",
      version: 1,
    });

    expect(result.isOk()).toBe(true);
    const { contentId, lastModifiedDate } = result.dataOrThrow();
    expect(lastModifiedDate).toBeInstanceOf(Date);
    expect(lastModifiedDate.getTime()).toBeGreaterThan(0);

    // Verify the row exists in DB with a real timestamp (not epoch ms)
    const [row] = await sql`
      SELECT id, text, last_modified_date FROM lines_contents WHERE id = ${contentId}
    `;
    expect(row.text).toBe("Hello world");
    expect(new Date(row.last_modified_date).getTime()).toBeGreaterThan(0);
    expect(typeof row.last_modified_date).not.toBe("number");
  });

  it("createLine inserts a line and updates lines_order", async () => {
    const lineId = uuidv4();
    const result = await repo.createLine({
      scriptId,
      lineId,
      lineType: "heading",
      position: 0,
    });

    expect(result.isOk()).toBe(true);

    const [script] = await sql`
      SELECT lines_order FROM scripts WHERE id = ${scriptId}
    `;
    expect(script.lines_order).toContain(lineId);
  });

  it("deleteLine removes the line and updates lines_order", async () => {
    const lineId = uuidv4();
    await repo.createLine({ scriptId, lineId, lineType: "freetext", position: 0 });

    const result = await repo.deleteLine({ scriptId, lineId });
    expect(result.isOk()).toBe(true);

    const [line] = await sql`
      SELECT id FROM lines WHERE id = ${lineId} AND script_id = ${scriptId}
    `;
    expect(line).toBeUndefined();

    const [script] = await sql`
      SELECT lines_order FROM scripts WHERE id = ${scriptId}
    `;
    expect(script.lines_order).not.toContain(lineId);
  });

  it("saveLineContent returns failure for non-existent script", async () => {
    const result = await repo.saveLineContent({
      scriptId: 999999,
      lineId: uuidv4(),
      content: { lineType: "freetext", text: "test" },
      contentType: "saved_version",
      version: 1,
    });
    expect(result.isFailure()).toBe(true);
  });

  it("saveLineContent with contentId upserts the same row instead of duplicating", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;
    const contentId = uuidv4();

    const first = await repo.saveLineContent({
      scriptId,
      lineId,
      contentId,
      content: { lineType: "freetext", text: "first" },
      contentType: "shared_draft",
      version: null,
    });
    const second = await repo.saveLineContent({
      scriptId,
      lineId,
      contentId,
      content: { lineType: "freetext", text: "second" },
      contentType: "shared_draft",
      version: null,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(second.dataOrThrow().contentId).toBe(contentId);

    const rows = await sql`
      SELECT id, text, deleted FROM lines_contents
      WHERE script_id = ${scriptId} AND line_id = ${lineId} AND type = 'shared_draft'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe("second");
    expect(rows[0]?.deleted).toBe(false);
  });

  it("saveLineContent shared_draft without contentId updates the line's current draft", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;

    const first = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "edit 1" },
      contentType: "shared_draft",
      version: null,
    });
    const second = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "edit 2" },
      contentType: "shared_draft",
      version: null,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    // Same row updated in place: no accumulation of draft rows per edit
    expect(second.dataOrThrow().contentId).toBe(first.dataOrThrow().contentId);

    const rows = await sql`
      SELECT id, text FROM lines_contents
      WHERE script_id = ${scriptId} AND line_id = ${lineId}
        AND type = 'shared_draft' AND deleted = false
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe("edit 2");
  });

  it("saveLineContent draft upserts one draft row per line and user", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;

    const first = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "draft edit 1" },
      contentType: "draft",
      version: null,
    });
    const second = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "draft edit 2" },
      contentType: "draft",
      version: null,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(second.dataOrThrow().contentId).toBe(first.dataOrThrow().contentId);

    const rows = await sql`
      SELECT id, type, text FROM lines_contents
      WHERE script_id = ${scriptId} AND line_id = ${lineId} AND deleted = false
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("draft");
    expect(rows[0]?.text).toBe("draft edit 2");
  });

  it("drafts are private: each user has their own draft row and only sees their own", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;
    const [user2] = await sql<{ id: number }[]>`
      INSERT INTO users (clerk_id, username, full_name, primary_email)
      VALUES ('test_clerk_id_2', 'testuser2', 'Test User 2', 'test2@example.com')
      RETURNING id
    `;
    const repo2 = new ScriptRepository(sql, mockUserService(user2.id));

    const r1 = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "user1 draft" },
      contentType: "draft",
      version: null,
    });
    const r2 = await repo2.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "user2 draft" },
      contentType: "draft",
      version: null,
    });
    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
    expect(r1.dataOrThrow().contentId).not.toBe(r2.dataOrThrow().contentId);

    const rows = await sql`
      SELECT id FROM lines_contents
      WHERE script_id = ${scriptId} AND line_id = ${lineId}
        AND type = 'draft' AND deleted = false
    `;
    expect(rows).toHaveLength(2);

    const changes1 = await repo.getLatestScriptChanges({ id: scriptId, since: new Date(0) });
    const draftDiffs1 = changes1
      .dataOrThrow()
      .diffs.filter((d) => !("lineType" in d) && d.type === "draft" && d.lineId === lineId);
    expect(draftDiffs1).toHaveLength(1);
    expect(draftDiffs1[0]?.id).toBe(r1.dataOrThrow().contentId);

    const changes2 = await repo2.getLatestScriptChanges({ id: scriptId, since: new Date(0) });
    const draftDiffs2 = changes2
      .dataOrThrow()
      .diffs.filter((d) => !("lineType" in d) && d.type === "draft" && d.lineId === lineId);
    expect(draftDiffs2).toHaveLength(1);
    expect(draftDiffs2[0]?.id).toBe(r2.dataOrThrow().contentId);
    expect(draftDiffs2[0]?.id).not.toBe(draftDiffs1[0]?.id);
  });

  it("saving a shared draft retires the author's draft row", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;

    // Simulate an edit auto-saved as the per-user draft
    const draft = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "work in progress" },
      contentType: "draft",
      version: null,
    });
    expect(draft.isOk()).toBe(true);

    // Committing as a shared draft must soft-delete the draft row
    const saved = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "shared version" },
      contentType: "shared_draft",
      version: null,
    });
    expect(saved.isOk()).toBe(true);

    const [draftRow] = await sql`
      SELECT deleted FROM lines_contents
      WHERE id = ${draft.dataOrThrow().contentId}
    `;
    expect(draftRow.deleted).toBe(true);

    // The re-sync diff must contain a content_delete for the draft row
    const changes = await repo.getLatestScriptChanges({ id: scriptId, since: new Date(0) });
    const draftDelete = changes
      .dataOrThrow()
      .diffs.find(
        (d) => !("lineType" in d) && d.id === draft.dataOrThrow().contentId && d.change.type === "content_delete",
      );
    expect(draftDelete).toBeDefined();
  });

  it("saveLineContent saved_version without contentId still creates a new version", async () => {
    const lineId = uuidv4();
    await sql`
      INSERT INTO lines (id, script_id, type) VALUES (${lineId}, ${scriptId}, 'freetext')
    `;

    const first = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "v1" },
      contentType: "saved_version",
      version: null,
    });
    const second = await repo.saveLineContent({
      scriptId,
      lineId,
      content: { lineType: "freetext", text: "v2" },
      contentType: "saved_version",
      version: null,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(second.dataOrThrow().contentId).not.toBe(first.dataOrThrow().contentId);

    const rows = await sql<{ version: number }[]>`
      SELECT version FROM lines_contents
      WHERE script_id = ${scriptId} AND line_id = ${lineId}
        AND type = 'saved_version' AND deleted = false
      ORDER BY version
    `;
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
  });
});
