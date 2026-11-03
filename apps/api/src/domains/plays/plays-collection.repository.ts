import { Result } from "@marivo/utils";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { Record } from "../../shared/record.ts";
import { InternalServerError } from "../../shared/error.ts";

interface TheatricalGenreRecordValues {
  key: string;
}

class TheatricalGenreRecord extends Record<TheatricalGenreRecordValues> {}

interface TheatricalPeriodRecordValues {
  key: string;
}

class TheatricalPeriodRecord extends Record<TheatricalPeriodRecordValues> {}

export class PlaysCollectionRepository extends UserRepositoryBase {
  async findAllGenres(): Promise<Result<TheatricalGenreRecord[], InternalServerError>> {
    const genreRecords = await this.sql<TheatricalGenreRecordValues[]>`
      SELECT key FROM theatrical_genres ORDER BY key;
    `;
    return Result.ok(genreRecords.map((values) => new TheatricalGenreRecord(values)));
  }
  async findAllPeriods(): Promise<Result<TheatricalPeriodRecord[], InternalServerError>> {
    const genreRecords = await this.sql<TheatricalPeriodRecordValues[]>`
      SELECT key FROM theatrical_periods ORDER BY key;
    `;
    return Result.ok(genreRecords.map((values) => new TheatricalPeriodRecord(values)));
  }
  async countAll(): Promise<Result<number, InternalServerError>> {
    const countRecords = await this.sql<{ count: string }[]>`
      SELECT COUNT(DISTINCT id) FROM public_domain_plays;
    `;
    const record = countRecords[0];
    if (!record) {
      return Result.failure(new InternalServerError("Failed to countAll collection plays"));
    }
    return Result.ok(Number.parseInt(record.count));
  }
}
