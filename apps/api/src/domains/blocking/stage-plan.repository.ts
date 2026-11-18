import { Result } from "@marivo/utils";
import { AppError, InternalServerError } from "../../shared/error.ts";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import {
  StagePlanStateSchema,
  type StagePlan,
  type StagePlanState,
  type StagePlanSummary,
} from "./blocking.models.ts";

export class StagePlanNotFound extends AppError {
  constructor(name: string) {
    super(`Stage plan not found: ${name}`, "NOT_FOUND");
  }
}

/** optimistic-concurrency (last-write-wins) conflict on stage plan version */
export class StagePlanConflict extends AppError {
  constructor(name: string) {
    super(`Stage plan "${name}" was modified by someone else; reload and retry`, "BAD_REQUEST");
  }
}

export class PlayNotFound extends AppError {
  constructor(uri: string) {
    super(`Play not found: ${uri}`, "NOT_FOUND");
  }
}

interface StagePlanRow {
  id: number;
  play_id: number;
  name: string;
  state: unknown;
  version: number;
  last_modified_date: Date;
  created_date: Date;
}

function rowToStagePlan(row: StagePlanRow): StagePlan {
  // postgres.js may return jsonb either parsed or as a raw string
  const raw = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
  const parsed = StagePlanStateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new InternalServerError(`Stored stage plan state is invalid: ${parsed.error.message}`);
  }
  return {
    id: row.id,
    playId: row.play_id,
    name: row.name,
    state: parsed.data,
    version: row.version,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

function rowToSummary(row: StagePlanRow): StagePlanSummary {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

export class StagePlanRepository extends UserRepositoryBase {
  async getPlayIdByUri(uri: string): Promise<Result<number, PlayNotFound>> {
    const [row] = await this.sql<{ id: number }[]>`
      SELECT id FROM plays WHERE uri = ${uri}
    `;
    if (!row) return Result.failure(new PlayNotFound(uri));
    return Result.ok(row.id);
  }

  async listStagePlans(playId: number): Promise<StagePlanSummary[]> {
    const rows = await this.sql<StagePlanRow[]>`
      SELECT id, play_id, name, state, version, last_modified_date, created_date
      FROM stage_plans
      WHERE play_id = ${playId}
      ORDER BY last_modified_date DESC
    `;
    return rows.map(rowToSummary);
  }

  /**
   * Without a name, returns the most recently modified plan (the "current" one).
   */
  async getStagePlan(playId: number, name?: string): Promise<Result<StagePlan, StagePlanNotFound>> {
    const rows = name
      ? await this.sql<StagePlanRow[]>`
          SELECT id, play_id, name, state, version, last_modified_date, created_date
          FROM stage_plans
          WHERE play_id = ${playId} AND name = ${name}
        `
      : await this.sql<StagePlanRow[]>`
          SELECT id, play_id, name, state, version, last_modified_date, created_date
          FROM stage_plans
          WHERE play_id = ${playId}
          ORDER BY last_modified_date DESC
          LIMIT 1
        `;
    const row = rows[0];
    if (!row) return Result.failure(new StagePlanNotFound(name ?? "(latest)"));
    return Result.ok(rowToStagePlan(row));
  }

  /**
   * Last-write-wins save: the write only succeeds if the stored version equals
   * `expectedVersion` (or no row exists yet and expectedVersion is 1).
   * Returns the new version.
   */
  async saveStagePlan(params: {
    playId: number;
    name: string;
    state: StagePlanState;
    expectedVersion: number;
  }): Promise<Result<number, StagePlanConflict>> {
    const { playId, name, state, expectedVersion } = params;
    const updated = await this.sql<{ version: number }[]>`
      UPDATE stage_plans
      SET state = ${JSON.stringify(state)}::jsonb,
          version = version + 1,
          last_modified_date = now()
      WHERE play_id = ${playId} AND name = ${name} AND version = ${expectedVersion}
      RETURNING version
    `;
    const [updatedRow] = updated;
    if (updatedRow) return Result.ok(updatedRow.version);

    const [existing] = await this.sql<{ id: number }[]>`
      SELECT id FROM stage_plans WHERE play_id = ${playId} AND name = ${name}
    `;
    if (existing) {
      // row exists but version did not match: someone else wrote in between
      return Result.failure(new StagePlanConflict(name));
    }
    if (expectedVersion !== 1) {
      // client thought the plan existed with that version, but it does not
      return Result.failure(new StagePlanConflict(name));
    }
    const inserted = await this.sql<{ version: number }[]>`
      INSERT INTO stage_plans (play_id, name, state, version)
      VALUES (${playId}, ${name}, ${JSON.stringify(state)}::jsonb, 1)
      ON CONFLICT (play_id, name) DO NOTHING
      RETURNING version
    `;
    const [insertedRow] = inserted;
    if (insertedRow) return Result.ok(insertedRow.version);
    // concurrent insert won the race
    return Result.failure(new StagePlanConflict(name));
  }
}
