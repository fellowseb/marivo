import { Result } from "@marivo/utils";
import { AppError, InternalServerError } from "../../shared/error.ts";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import {
  StagePlanStateSchema,
  type StagePlan,
  type StagePlanState,
  type StagePlanSummary,
} from "./blocking.models.ts";
import {
  rescaleCueData,
  rescaleStagePlanState,
  type NewDimensionsMm,
} from "./stage-plan-rescale.lib.ts";

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

export class StagePlanNameTaken extends AppError {
  constructor(name: string) {
    super(`A stage plan named "${name}" already exists for this play`, "BAD_REQUEST");
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
  description: string | null;
  stage_label: string | null;
  is_active: boolean;
  last_modified_date: Date;
  created_date: Date;
}

function parseJsonb(raw: unknown): unknown {
  // postgres.js may return jsonb either parsed or as a raw string
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function parseState(raw: unknown): StagePlanState {
  const parsed = StagePlanStateSchema.safeParse(parseJsonb(raw));
  if (!parsed.success) {
    throw new InternalServerError(`Stored stage plan state is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

function rowToStagePlan(row: StagePlanRow): StagePlan {
  return {
    id: row.id,
    playId: row.play_id,
    name: row.name,
    state: parseState(row.state),
    version: row.version,
    description: row.description,
    stageLabel: row.stage_label,
    isActive: row.is_active,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

function rowToSummary(row: StagePlanRow): StagePlanSummary {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    stageLabel: row.stage_label,
    isActive: row.is_active,
    lastModifiedDate: row.last_modified_date,
    createdDate: row.created_date,
  };
}

const STAGE_PLAN_COLUMNS = `
  id, play_id, name, state, version, description, stage_label, is_active,
  last_modified_date, created_date
`;

interface CueRow {
  id: number;
  track_id: string;
  element_id: string | null;
  group_id: string | null;
  kind: string;
  start_ms: number;
  duration_ms: number;
  data: unknown;
  editable: boolean;
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
      SELECT ${this.sql.unsafe(STAGE_PLAN_COLUMNS)}
      FROM stage_plans
      WHERE play_id = ${playId}
      ORDER BY is_active DESC, last_modified_date DESC
    `;
    return rows.map(rowToSummary);
  }

  /**
   * Without a name, returns the active plan, or the most recently modified one
   * if none is active.
   */
  async getStagePlan(playId: number, name?: string): Promise<Result<StagePlan, StagePlanNotFound>> {
    const rows = name
      ? await this.sql<StagePlanRow[]>`
          SELECT ${this.sql.unsafe(STAGE_PLAN_COLUMNS)}
          FROM stage_plans
          WHERE play_id = ${playId} AND name = ${name}
        `
      : await this.sql<StagePlanRow[]>`
          SELECT ${this.sql.unsafe(STAGE_PLAN_COLUMNS)}
          FROM stage_plans
          WHERE play_id = ${playId}
          ORDER BY is_active DESC, last_modified_date DESC
          LIMIT 1
        `;
    const row = rows[0];
    if (!row) return Result.failure(new StagePlanNotFound(name ?? "(active)"));
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
    description?: string | null | undefined;
    stageLabel?: string | null | undefined;
  }): Promise<Result<number, StagePlanConflict>> {
    const { playId, name, state, expectedVersion, description, stageLabel } = params;
    const updated = await this.sql<{ version: number }[]>`
      UPDATE stage_plans
      SET state = ${JSON.stringify(state)}::jsonb,
          description = COALESCE(${description ?? null}, description),
          stage_label = COALESCE(${stageLabel ?? null}, stage_label),
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
      INSERT INTO stage_plans (play_id, name, state, version, description, stage_label)
      VALUES (
        ${playId},
        ${name},
        ${JSON.stringify(state)}::jsonb,
        1,
        ${description ?? null},
        ${stageLabel ?? null}
      )
      ON CONFLICT (play_id, name) DO NOTHING
      RETURNING version
    `;
    const [insertedRow] = inserted;
    if (insertedRow) return Result.ok(insertedRow.version);
    // concurrent insert won the race
    return Result.failure(new StagePlanConflict(name));
  }

  /**
   * Marks one plan active and deactivates the play's other plans (same
   * transaction, so exactly one active per play).
   */
  async setActiveStagePlan(params: {
    playId: number;
    name: string;
  }): Promise<Result<undefined, StagePlanNotFound>> {
    const [row] = await this.sql<{ id: number }[]>`
      SELECT id FROM stage_plans WHERE play_id = ${params.playId} AND name = ${params.name}
    `;
    if (!row) return Result.failure(new StagePlanNotFound(params.name));
    await this.sql`
      UPDATE stage_plans SET is_active = false WHERE play_id = ${params.playId}
    `;
    await this.sql`
      UPDATE stage_plans SET is_active = true, last_modified_date = now()
      WHERE id = ${row.id}
    `;
    return Result.ok(undefined);
  }

  /**
   * Copies a stage plan (and all its cues) under `newName`, version reset to 1.
   * If `newDimensionsMm` is given, every mm coordinate in the state and in the
   * cue data is rescaled to the new stage size. Returns the out-of-bounds
   * element ids instead of clamping them.
   */
  async duplicateStagePlan(params: {
    playId: number;
    name: string;
    newName: string;
    description?: string | null | undefined;
    stageLabel?: string | null | undefined;
    newLibraryPlanId?: string | null | undefined;
    newDimensionsMm?: NewDimensionsMm | undefined;
  }): Promise<
    Result<
      { plan: StagePlan; copiedCues: number; outOfBoundsElementIds: string[] },
      StagePlanNotFound | StagePlanNameTaken
    >
  > {
    const source = await this.getStagePlan(params.playId, params.name);
    if (source.isFailure()) return Result.failure(source.errorOrThrow());
    const src = source.dataOrThrow();

    const [taken] = await this.sql<{ id: number }[]>`
      SELECT id FROM stage_plans
      WHERE play_id = ${params.playId} AND name = ${params.newName}
    `;
    if (taken) return Result.failure(new StagePlanNameTaken(params.newName));

    let newState = src.state;
    let outOfBoundsElementIds: string[] = [];
    if (params.newDimensionsMm) {
      const rescaled = rescaleStagePlanState(newState, params.newDimensionsMm);
      newState = rescaled.state;
      outOfBoundsElementIds = rescaled.outOfBoundsElementIds;
    }
    if (params.newLibraryPlanId !== undefined) {
      newState = {
        ...newState,
        plan: { ...newState.plan, libraryPlanId: params.newLibraryPlanId },
      };
    }

    const [inserted] = await this.sql<StagePlanRow[]>`
      INSERT INTO stage_plans
        (play_id, name, state, version, description, stage_label, is_active)
      VALUES (
        ${params.playId},
        ${params.newName},
        ${JSON.stringify(newState)}::jsonb,
        1,
        ${params.description ?? src.description},
        ${params.stageLabel ?? src.stageLabel},
        false
      )
      RETURNING ${this.sql.unsafe(STAGE_PLAN_COLUMNS)}
    `;
    if (!inserted) {
      throw new InternalServerError("Unexpected empty row on duplicateStagePlan insert");
    }
    const newPlan = rowToStagePlan(inserted);

    const cues = await this.sql<CueRow[]>`
      SELECT id, track_id, element_id, group_id, kind, start_ms, duration_ms, data, editable
      FROM blocking_cues
      WHERE stage_plan_id = ${src.id}
      ORDER BY start_ms, id
    `;
    const fx = params.newDimensionsMm
      ? params.newDimensionsMm.width / src.state.plan.dimensionsMm.width
      : 1;
    const fy = params.newDimensionsMm
      ? params.newDimensionsMm.height / src.state.plan.dimensionsMm.height
      : 1;
    for (const cue of cues) {
      const cueData = parseJsonb(cue.data);
      const data =
        params.newDimensionsMm && (fx !== 1 || fy !== 1)
          ? rescaleCueData(cueData, fx, fy)
          : cueData;
      await this.sql`
        INSERT INTO blocking_cues
          (stage_plan_id, track_id, element_id, group_id, kind, start_ms, duration_ms, data, editable)
        VALUES (
          ${newPlan.id},
          ${cue.track_id},
          ${cue.element_id},
          ${cue.group_id},
          ${cue.kind},
          ${cue.start_ms},
          ${cue.duration_ms},
          ${JSON.stringify(data)}::jsonb,
          ${cue.editable}
        )
      `;
    }

    return Result.ok({
      plan: newPlan,
      copiedCues: cues.length,
      outOfBoundsElementIds,
    });
  }
}
