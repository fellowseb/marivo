import { type Sql } from 'postgres';
import { UserContextService } from '../../shared/use-case.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
import { Result } from '@marivo/utils';
import { AppError } from '../../shared/error.ts';
import { type ScriptDiff } from './script.models.ts';

interface ScriptRow {
  id: number;
  checksum: string;
  lines_order: string[];
  characters: { [id: string]: string };
  last_modified_date: number;
}

interface LineRow {
  id: string;
  type: 'chartext' | 'heading' | 'freetext';
  last_modified_date: number;
}

interface LineContentRow {
  id: string;
  type: 'saved_version' | 'shared_draft';
  line_id: string;
  line_type: 'chartext' | 'heading' | 'freetext';
  deleted: boolean;
  characters: string[] | null;
  heading_level: number | null;
  text: string;
  last_modified_date: number;
  version: number;
  author_username: string;
}

export class ScriptOfPlayNotFound extends AppError {
  constructor() {
    super('Unable to find script for given play uri', 'NOT_FOUND');
  }
}

export class ScriptRepository extends UserRepositoryBase {
  constructor(sql: Sql, userService: UserContextService) {
    super(sql, userService);
  }

  async getLatestScriptChanges(params: {
    uri: string;
    since: Date;
  }): Promise<Result<ScriptDiff, ScriptOfPlayNotFound>> {
    const [scriptRow] = await this.sql<ScriptRow[]>`
      SELECT 
        s.id,
        s.checksum, 
        s.lines_order ,
        s.last_modified_date,
        s.characters
      FROM plays p 
        JOIN scripts s ON s.id = p.script_id 
      WHERE p.uri = ${params.uri}`;
    if (!scriptRow) {
      return Result.failure(new ScriptOfPlayNotFound());
    }
    const lineRows = await this.sql<LineRow[]>`
      SELECT
        id, 
        type, 
        last_modified_date
      FROM lines 
      WHERE script_id = ${scriptRow.id}
        AND last_modified_date > ${params.since.getTime()}`;
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
        JOIN users u ON u.id = l.author_id
      WHERE script_id = ${scriptRow.id}
        AND last_modified_date > ${params.since.getTime()}`;
    return Result.ok({
      checksum: scriptRow.checksum,
      diffs: [
        ...lineRows.map((lineRow) => {
          return {
            id: lineRow.id,
            lineType: lineRow.type,
            lastModifiedDate: new Date(lineRow.last_modified_date),
            change: {
              type: 'line_create' as const,
            },
          };
        }),
        ...lineContentRows.map((lineContentRow) => {
          const change = lineContentRow.deleted
            ? {
                type: 'content_delete' as const,
              }
            : {
                type: 'content_create_update' as const,
                content:
                  lineContentRow.line_type === 'heading'
                    ? {
                        lineType: 'heading' as const,
                        headingLevel: lineContentRow.heading_level ?? 0,
                        text: lineContentRow.text,
                      }
                    : lineContentRow.line_type === 'freetext'
                      ? {
                          lineType: 'freetext' as const,
                          text: lineContentRow.text,
                        }
                      : {
                          lineType: 'chartext' as const,
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
      characters: scriptRow.characters,
    });
  }
}
