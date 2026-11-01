import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { v4 as uuidv4 } from "uuid";
import { type TransactionSql } from "postgres";
import { Result } from "@marivo/utils";
import { UserContextService } from "../../shared/use-case.ts";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { AppError } from "../../shared/error.ts";
import { type ScriptDiff } from "./script.models.ts";

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
  type: "saved_version" | "shared_draft";
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
        AND last_modified_date > ${params.since}`;
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
      throw new Error("Failed to create script");
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

    let count = 0;
    const addLineColumnsTransform2 = new Transform({
      objectMode: true,
      transform(row: string[], _encoding, callback) {
        const lineType = row[0];
        const characters = lineType === "chartext" ? row[1] : "{}";
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
      throw new Error("Failed to create script");
    }
    return scriptRow.id;
  }

  async saveLineContent(params: {
    scriptId: number;
    lineId: string;
    content: {
      lineType: "heading" | "chartext" | "freetext";
      text: string;
      characters?: string[] | undefined;
      headingLevel?: number | undefined;
    };
    contentType: "saved_version" | "shared_draft";
    version: number | null;
  }): Promise<Result<{ contentId: string; lastModifiedDate: Date }, ScriptNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT id FROM scripts WHERE id = ${params.scriptId}`;
    if (!scriptRow) {
      return Result.failure(new ScriptNotFound());
    }
    const contentId = uuidv4();
    const now = new Date();
    const { lineType, text, characters, headingLevel } = params.content;
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
        ${lineType},
        ${lineType === "chartext" ? this.sql.json(characters ?? []) : null},
        ${lineType === "heading" ? (headingLevel ?? 0) : null},
        ${text},
        ${contentId},
        ${params.contentType},
        'pending',
        ${params.version ?? 1},
        ${now},
        ${this.userId()}
      )`;
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
