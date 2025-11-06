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
  last_modified_date: number;
}

interface LineRow {
  id: string;
  type: 'chartext' | 'heading' | 'freetext';
  deleted: boolean;
  characters: string[] | null;
  heading_level: number | null;
  text: string;
  last_modified_date: number;
  version: number;
  previous_versions_ids: string[] | null;
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
        s.last_modified_date
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
        deleted, 
        characters, 
        heading_level, 
        text,
        last_modified_date,
        version,
        previous_versions_ids
      FROM lines 
      WHERE script_id = ${scriptRow.id}
        AND last_modified_date > ${params.since.getTime()}`;
    return Result.ok({
      checksum: scriptRow.checksum,
      diffs: lineRows.map((lineRow) => {
        const change = lineRow.deleted
          ? {
              type: 'delete' as const,
            }
          : {
              type: 'create_update' as const,
              content:
                lineRow.type === 'heading'
                  ? {
                      type: 'heading' as const,
                      headingLevel: lineRow.heading_level ?? 0,
                      text: lineRow.text,
                    }
                  : lineRow.type === 'freetext'
                    ? {
                        type: 'freetext' as const,
                        text: lineRow.text,
                      }
                    : {
                        type: 'chartext' as const,
                        text: lineRow.text,
                        characters: lineRow.characters ?? [],
                      },
            };
        return {
          id: lineRow.id,
          lastModifiedDate: new Date(lineRow.last_modified_date),
          version: lineRow.version,
          ...(lineRow.previous_versions_ids
            ? { previousVersionsIds: lineRow.previous_versions_ids }
            : {}),
          change,
        };
      }),
      lastModifiedDate: new Date(scriptRow.last_modified_date),
      linesOrder: scriptRow.lines_order,
    });
  }
}
