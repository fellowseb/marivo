import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { v4 as uuidv4 } from "uuid";
import { type Sql, type TransactionSql } from "postgres";
import { Result } from "@marivo/utils";
import { UserContextService } from "../../shared/use-case.ts";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { AppError, InternalServerError } from "../../shared/error.ts";
import { type LineContentType, type ScriptDiff } from "./script.models.ts";

interface ScriptRow {
  id: number;
  checksum: string;
  lines_order: string[];
  characters: { [id: string]: string };
  last_modified_date: number;
}

interface LineRow {
  id: string;
  type: "chartext" | "heading" | "freetext";
  last_modified_date: number;
}

interface LineContentRow {
  id: string;
  type: LineContentType;
  line_id: string;
  line_type: "chartext" | "heading" | "freetext";
  deleted: boolean;
  characters: string[] | null;
  heading_level: number | null;
  text: string;
  last_modified_date: number;
  version: number;
  author_username: string;
}

export class ScriptNotFound extends AppError {
  constructor() {
    super("Unable to find script", "NOT_FOUND");
  }
}

export class ScriptRepository extends UserRepositoryBase {
  constructor(sql: TransactionSql, userService: UserContextService) {
    super(sql, userService);
  }

  async getLatestScriptChanges(params: {
    id: number;
    since: Date;
  }): Promise<Result<ScriptDiff, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT 
        id,
        checksum, 
        lines_order ,
        last_modified_date,
        characters
      FROM scripts 
      WHERE id = ${params.id}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const lineRows = await this.sql<LineRow[]>`
      SELECT
        id, 
        type, 
        last_modified_date
      FROM lines 
      WHERE script_id = ${scriptRow.id}
        AND last_modified_date > ${params.since}`;
    const lineContentRows = await this.sql<LineContentRow[]>`
      SELECT
        l.id,
        l.type,
        l.line_id,
        l.line_type,
        l.deleted,
        l.characters,
        l.heading_level,
        l.text,
        l.last_modified_date,
        l.version,
        u.username AS author_username
      FROM lines_contents l
        LEFT JOIN users u ON u.id = l.author_id
      WHERE script_id = ${scriptRow.id}
        AND last_modified_date > ${params.since}
        -- Drafts are private: only their author receives them
        AND (l.type != 'draft' OR l.author_id = ${this.userId()})`;
    return Result.ok({
      checksum: scriptRow.checksum,
      diffs: [
        ...lineRows.map((lineRow) => {
          return {
            id: lineRow.id,
            lineType: lineRow.type,
            lastModifiedDate: new Date(lineRow.last_modified_date),
            change: {
              type: "line_create" as const,
            },
          };
        }),
        ...lineContentRows.map((lineContentRow) => {
          const change = lineContentRow.deleted
            ? {
                type: "content_delete" as const,
              }
            : {
                type: "content_create_update" as const,
                content:
                  lineContentRow.line_type === "heading"
                    ? {
                        lineType: "heading" as const,
                        headingLevel: lineContentRow.heading_level ?? 0,
                        text: lineContentRow.text,
                      }
                    : lineContentRow.line_type === "freetext"
                      ? {
                          lineType: "freetext" as const,
                          text: lineContentRow.text,
                        }
                      : {
                          lineType: "chartext" as const,
                          text: lineContentRow.text,
                          characters: lineContentRow.characters ?? [],
                        },
              };
          return {
            id: lineContentRow.id,
            type: lineContentRow.type,
            lineId: lineContentRow.line_id,
            lastModifiedDate: new Date(lineContentRow.last_modified_date),
            version: lineContentRow.version,
            change,
            authorUsername: lineContentRow.author_username,
          };
        }),
      ],
      lastModifiedDate: new Date(scriptRow.last_modified_date),
      linesOrder: scriptRow.lines_order,
      characters: scriptRow.characters ?? {},
    });
  }

  async createScriptFromStream(params: {
    characters: { [id: string]: string };
    linesStream: NodeJS.ReadableStream;
    linesContentsStream: NodeJS.ReadableStream;
  }) {
    // Insert script
    const [scriptRow] = await this.sql<{ id: number }[]>`
      INSERT INTO scripts (
        checksum,
        characters
      ) VALUES (
        '1b91a822a6a14f389f85590bfe664962',
        ${this.sql.json(params.characters)}
      ) RETURNING id;
    `;
    if (!scriptRow) {
      throw new InternalServerError("Failed to create script");
    }
    const parser = parse({ columns: false, delimiter: "|" }); // Parse as arrays (not objects)
    const stringifier = stringify({
      delimiter: "\t",
      header: false,
      record_delimiter: "\n",
    });
    const scriptId = scriptRow.id;

    // CSV line:
    // line_type,characters,heading_level,text
    const linesOrder: string[] = [];
    // const userId = this.userId();
    const addLineColumnsTransform = new Transform({
      objectMode: true,
      transform(row: string[], _encoding, callback) {
        const lineId = uuidv4();
        linesOrder.push(lineId);
        callback(null, [
          scriptId, // script_id
          lineId, // id
          row[0], // type
        ]);
      },
    });

    // Map CSV character tokens (uuids, or names) to known character ids.
    // Unknown placeholders (e.g. CHARACTER_02) are dropped instead of crashing
    // the COPY on the uuid[] column.
    const characterIds = Object.keys(params.characters);
    const nameToId = new Map(
      Object.entries(params.characters).map(([id, name]) => [name, id] as const),
    );
    const resolveCharacterIds = (raw: string | undefined): string => {
      const inner = (raw ?? "").replace(/^\{+|\}+$/g, "");
      const tokens = inner
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      const ids = tokens
        .map((token) => nameToId.get(token) ?? (characterIds.includes(token) ? token : undefined))
        .filter((id): id is string => id !== undefined);
      return ids.length ? `{${ids.join(",")}}` : "{}";
    };

    let count = 0;
    const addLineColumnsTransform2 = new Transform({
      objectMode: true,
      transform(row: string[], _encoding, callback) {
        const lineType = row[0];
        const characters = lineType === "chartext" ? resolveCharacterIds(row[1]) : "{}";
        const headingLevel = lineType === "heading" ? parseInt(row[2] as string, 10) : 5;
        const id = uuidv4();
        callback(null, [
          scriptId, // script_id
          linesOrder[count], // line_id
          lineType, // line_type
          characters, // characters
          headingLevel, // heading_level
          row[3], // text
          id, // id
          "saved_version", // type
          "cd39946332fa4324929603d8659de563", // checksum
          1, // version
        ]);
        count++;
      },
    });

    // Insert lines
    const copyLinesQuery = await this.sql`COPY lines (script_id, id, type) FROM stdin`.writable();
    await pipeline(
      params.linesStream,
      parser,
      addLineColumnsTransform,
      stringifier,
      copyLinesQuery,
      {
        end: true,
      },
    );

    // Insert lines contexts
    const copyLinesContentsQuery = await this.sql`COPY lines_contents (
        script_id,
        line_id,
        line_type,
        characters,
        heading_level,
        text,
        id,
        type,
        checksum,
        version
      ) FROM stdin`.writable();
    const parser2 = parse({ columns: false, delimiter: "|" }); // Parse as arrays (not objects)
    const stringifier2 = stringify({
      delimiter: "\t",
      header: false,
      record_delimiter: "\n",
    });

    await pipeline(
      params.linesContentsStream,
      parser2,
      addLineColumnsTransform2,
      stringifier2,
      copyLinesContentsQuery,
      {
        end: true,
      },
    );
    // Update lines_order column in script
    await this.sql`
      UPDATE scripts
        SET lines_order = ${linesOrder}::uuid[]
        WHERE id = ${scriptId};
    `;
    return scriptId;
  }

  async createScript() {
    // Insert script
    const [scriptRow] = await this.sql<{ id: number }[]>`
      INSERT INTO scripts (
        checksum
      ) VALUES (
        '1b91a822a6a14f389f85590bfe664962'
      ) RETURNING id;
    `;
    if (!scriptRow) {
      throw new InternalServerError("Failed to create script");
    }
    return scriptRow.id;
  }

  /**
   * Duplicate a script into a new script row: lines are copied (same line
   * ids), but only the latest saved version of each line is kept — older
   * saved versions, shared drafts and per-user drafts are dropped. When
   * `keepLineIds` is provided, only those lines are copied and `lines_order`
   * is filtered to them (order preserved). Runs in the caller's transaction.
   */
  async copyScript(
    scriptId: number,
    keepLineIds?: string[],
  ): Promise<Result<number, ScriptNotFound>> {
    const [source] = await this.sql<
      {
        checksum: string;
        lines_order: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        characters: any;
      }[]
    >`
      SELECT checksum, lines_order, characters
      FROM scripts
      WHERE id = ${scriptId};
    `;
    if (!source) {
      return Result.failure(new ScriptNotFound());
    }
    const keptOrder = keepLineIds
      ? source.lines_order.filter((lineId) => keepLineIds.includes(lineId))
      : source.lines_order;
    const [scriptRow] = await this.sql<{ id: number }[]>`
      INSERT INTO scripts (
        checksum,
        lines_order,
        characters
      )
      VALUES (
        ${source.checksum},
        ${keptOrder},
        ${this.sql.json(source.characters)}::jsonb
      )
      RETURNING id;
    `;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const newScriptId = scriptRow.id;
    await this.sql`
      INSERT INTO lines (
        id,
        script_id,
        type,
        last_modified_date
      )
      SELECT
        id,
        ${newScriptId},
        type,
        last_modified_date
      FROM lines
      WHERE script_id = ${scriptId}
      ${keepLineIds ? this.sql`AND id = ANY(${keepLineIds}::uuid[])` : this.sql``};
    `;
    await this.sql`
      INSERT INTO lines_contents (
        id,
        script_id,
        type,
        line_id,
        line_type,
        deleted,
        characters,
        heading_level,
        text,
        last_modified_date,
        checksum,
        version,
        author_id
      )
      SELECT
        lc.id,
        ${newScriptId},
        lc.type,
        lc.line_id,
        lc.line_type,
        lc.deleted,
        lc.characters,
        lc.heading_level,
        lc.text,
        lc.last_modified_date,
        lc.checksum,
        lc.version,
        lc.author_id
      FROM lines_contents lc
      WHERE lc.script_id = ${scriptId}
        AND lc.type = 'saved_version'
        AND lc.version = (
          SELECT MAX(lc2.version)
          FROM lines_contents lc2
          WHERE lc2.script_id = lc.script_id
            AND lc2.line_id = lc.line_id
            AND lc2.type = 'saved_version'
        )
        ${keepLineIds ? this.sql`AND lc.line_id = ANY(${keepLineIds}::uuid[])` : this.sql``};
    `;
    return Result.ok(newScriptId);
  }

  async saveLineContent(params: {
    scriptId: number;
    lineId: string;
    contentId?: string | undefined;
    content: {
      lineType: "heading" | "chartext" | "freetext";
      text: string;
      characters?: string[] | undefined;
      headingLevel?: number | undefined;
    };
    contentType: LineContentType;
    version: number | null;
  }): Promise<Result<{ contentId: string; lastModifiedDate: Date }, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT id FROM scripts WHERE id = ${params.scriptId}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const now = new Date();
    const { lineType, text, characters, headingLevel } = params.content;
    // Safety net: the line row must exist for the lines_contents FK. Clients
    // are expected to call createLine on insert; this keeps saveLineContent
    // working even if that call was missed.
    await this.sql`
      INSERT INTO lines (script_id, id, type, last_modified_date)
      VALUES (${params.scriptId}, ${params.lineId}, ${lineType}, ${now})
      ON CONFLICT (id, script_id) DO NOTHING`;
    await this.sql`
      UPDATE scripts
      SET lines_order = array_append(COALESCE(lines_order, '{}'), ${params.lineId}::uuid),
          last_modified_date = ${now}
      WHERE id = ${params.scriptId}
        AND NOT (${params.lineId}::uuid = ANY(COALESCE(lines_order, '{}')))`;
    // Auto-increment version for saved_version: find max existing version for this line
    let version = params.version;
    if (params.contentType === "saved_version" && (version === null || version === undefined)) {
      const [row] = await this.sql<{ max: number | null }[]>`
        SELECT MAX(version)::int AS max FROM lines_contents
        WHERE script_id = ${params.scriptId} AND line_id = ${params.lineId} AND type = 'saved_version'
      `;
      version = (row?.max ?? 0) + 1;
    }
    const effectiveVersion = version ?? 1;
    const charactersValue = lineType === "chartext" ? this.sql.json(characters ?? []) : null;
    const headingLevelValue = lineType === "heading" ? (headingLevel ?? 0) : null;

    if (params.contentType !== "draft") {
      // Committing the draft as a saved version / shared draft retires the
      // author's per-user draft row, so it does not reappear on other clients
      // (or on this one after re-sync) as the current draft.
      await this.sql`
        UPDATE lines_contents
        SET deleted = true, last_modified_date = ${now}
        WHERE script_id = ${params.scriptId}
          AND line_id = ${params.lineId}
          AND type = 'draft'
          AND author_id = ${this.userId()}
          AND deleted = false`;
    }

    let contentId = params.contentId;
    if (params.contentType === "draft") {
      // Drafts are per-user: one draft row per (line, author), upserted in
      // place with a server-generated id. The client-provided contentId is
      // ignored for drafts.
      const updated = await this.sql<{ id: string }[]>`
        UPDATE lines_contents SET
          line_type = ${lineType},
          characters = ${charactersValue},
          heading_level = ${headingLevelValue},
          text = ${text},
          version = ${effectiveVersion},
          deleted = false,
          last_modified_date = ${now},
          author_id = ${this.userId()}
        WHERE id = (
          SELECT id FROM lines_contents
          WHERE script_id = ${params.scriptId}
            AND line_id = ${params.lineId}
            AND type = 'draft'
            AND author_id = ${this.userId()}
            AND deleted = false
          ORDER BY last_modified_date DESC
          LIMIT 1
        )
        RETURNING id`;
      if (updated.length > 0 && updated[0]) {
        contentId = updated[0].id;
      } else {
        contentId = await this.insertLineContent({
          scriptId: params.scriptId,
          lineId: params.lineId,
          contentId: uuidv4(),
          lineType,
          charactersValue,
          headingLevelValue,
          text,
          contentType: params.contentType,
          version: effectiveVersion,
          now,
        });
      }
    } else if (contentId) {
      // Upsert by id: update the row in place if it exists (even soft-deleted),
      // otherwise insert with the client-provided id. This keeps the server id
      // identical to the optimistic local id, so polling clients never see
      // duplicate entries.
      const updated = await this.sql<{ id: string }[]>`
        UPDATE lines_contents SET
          line_type = ${lineType},
          characters = ${charactersValue},
          heading_level = ${headingLevelValue},
          text = ${text},
          type = ${params.contentType},
          version = ${effectiveVersion},
          deleted = false,
          last_modified_date = ${now},
          author_id = ${this.userId()}
        WHERE id = ${contentId} AND script_id = ${params.scriptId}
        RETURNING id`;
      if (updated.length === 0) {
        contentId = await this.insertLineContent({
          scriptId: params.scriptId,
          lineId: params.lineId,
          contentId,
          lineType,
          charactersValue,
          headingLevelValue,
          text,
          contentType: params.contentType,
          version: effectiveVersion,
          now,
        });
      }
    } else if (params.contentType === "shared_draft") {
      // A shared draft without explicit id is an edit of the line's current
      // shared draft: upsert the latest non-deleted row instead of inserting
      // a new one on every edit.
      const updated = await this.sql<{ id: string }[]>`
        UPDATE lines_contents SET
          line_type = ${lineType},
          characters = ${charactersValue},
          heading_level = ${headingLevelValue},
          text = ${text},
          version = ${effectiveVersion},
          deleted = false,
          last_modified_date = ${now},
          author_id = ${this.userId()}
        WHERE id = (
          SELECT id FROM lines_contents
          WHERE script_id = ${params.scriptId}
            AND line_id = ${params.lineId}
            AND type = ${params.contentType}
            AND deleted = false
          ORDER BY last_modified_date DESC
          LIMIT 1
        )
        RETURNING id`;
      if (updated.length > 0 && updated[0]) {
        contentId = updated[0].id;
      } else {
        contentId = await this.insertLineContent({
          scriptId: params.scriptId,
          lineId: params.lineId,
          contentId: uuidv4(),
          lineType,
          charactersValue,
          headingLevelValue,
          text,
          contentType: params.contentType,
          version: effectiveVersion,
          now,
        });
      }
    } else {
      contentId = await this.insertLineContent({
        scriptId: params.scriptId,
        lineId: params.lineId,
        contentId: uuidv4(),
        lineType,
        charactersValue,
        headingLevelValue,
        text,
        contentType: params.contentType,
        version: effectiveVersion,
        now,
      });
    }
    // Update script last_modified_date
    await this.sql`
      UPDATE scripts
      SET last_modified_date = ${now}
      WHERE id = ${params.scriptId}`;
    return Result.ok({
      contentId,
      lastModifiedDate: new Date(now),
    });
  }

  private async insertLineContent(params: {
    scriptId: number;
    lineId: string;
    contentId: string;
    lineType: "heading" | "chartext" | "freetext";
    charactersValue: ReturnType<Sql["json"]> | null;
    headingLevelValue: number | null;
    text: string;
    contentType: LineContentType;
    version: number;
    now: Date;
  }): Promise<string> {
    await this.sql`
      INSERT INTO lines_contents (
        script_id,
        line_id,
        line_type,
        characters,
        heading_level,
        text,
        id,
        type,
        checksum,
        version,
        last_modified_date,
        author_id
      ) VALUES (
        ${params.scriptId},
        ${params.lineId},
        ${params.lineType},
        ${params.charactersValue},
        ${params.headingLevelValue},
        ${params.text},
        ${params.contentId},
        ${params.contentType},
        'pending',
        ${params.version},
        ${params.now},
        ${this.userId()}
      )`;
    return params.contentId;
  }

  async createLine(params: {
    scriptId: number;
    lineId: string;
    lineType: "heading" | "chartext" | "freetext";
    position: number;
  }): Promise<Result<{ lastModifiedDate: Date }, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT id, lines_order FROM scripts WHERE id = ${params.scriptId}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const now = new Date();
    await this.sql`
      INSERT INTO lines (script_id, id, type, last_modified_date)
      VALUES (${params.scriptId}, ${params.lineId}, ${params.lineType}, ${now})`;
    // Update lines_order
    const newOrder = [...(scriptRow.lines_order ?? [])];
    newOrder.splice(params.position, 0, params.lineId);
    await this.sql`
      UPDATE scripts
      SET lines_order = ${newOrder}::uuid[], last_modified_date = ${now}
      WHERE id = ${params.scriptId}`;
    return Result.ok({ lastModifiedDate: new Date(now) });
  }

  async deleteLineContent(params: {
    scriptId: number;
    lineId: string;
    contentId: string;
  }): Promise<Result<{ lastModifiedDate: Date }, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT id FROM scripts WHERE id = ${params.scriptId}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const now = new Date();
    // Soft-delete: mark as deleted so other clients see content_delete
    await this.sql`
      UPDATE lines_contents
      SET deleted = true, last_modified_date = ${now}
      WHERE script_id = ${params.scriptId} AND line_id = ${params.lineId} AND id = ${params.contentId}`;
    await this.sql`
      UPDATE scripts SET last_modified_date = ${now} WHERE id = ${params.scriptId}`;
    return Result.ok({ lastModifiedDate: now });
  }

  async deleteLine(params: {
    scriptId: number;
    lineId: string;
  }): Promise<Result<{ lastModifiedDate: Date }, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT id, lines_order FROM scripts WHERE id = ${params.scriptId}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const now = new Date();
    await this.sql`
      DELETE FROM lines WHERE script_id = ${params.scriptId} AND id = ${params.lineId}`;
    const newOrder = (scriptRow.lines_order ?? []).filter((id) => id !== params.lineId);
    await this.sql`
      UPDATE scripts
      SET lines_order = ${newOrder}::uuid[], last_modified_date = ${now}
      WHERE id = ${params.scriptId}`;
    return Result.ok({ lastModifiedDate: new Date(now) });
  }
}
