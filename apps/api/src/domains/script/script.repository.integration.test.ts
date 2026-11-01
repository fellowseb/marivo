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
});
