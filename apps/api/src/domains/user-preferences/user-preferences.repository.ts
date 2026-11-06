import { Result, type ThemeValue } from "@marivo/utils";
import { UserRepositoryBase } from "../../shared/user-repository-base.ts";
import { AppError } from "../../shared/error.ts";

export class UserNotFound extends AppError {
  constructor() {
    super("User not found", "NOT_FOUND");
  }
}

export interface UserPreferencesRepository {
  getTheme(): Promise<Result<ThemeValue, UserNotFound>>;
  setTheme(theme: ThemeValue): Promise<Result<ThemeValue, UserNotFound>>;
}

export class PostgresUserPreferencesRepository
  extends UserRepositoryBase
  implements UserPreferencesRepository
{
  async getTheme(): Promise<Result<ThemeValue, UserNotFound>> {
    const [row] = await this.sql<
      { theme: ThemeValue }[]
    >`SELECT theme FROM users WHERE id = ${this.userId()}`;
    if (!row) {
      return Result.failure(new UserNotFound());
    }
    return Result.ok(row.theme);
  }

  async setTheme(theme: ThemeValue): Promise<Result<ThemeValue, UserNotFound>> {
    const [row] = await this.sql<{ theme: ThemeValue }[]>`
      UPDATE users SET theme = ${theme} WHERE id = ${this.userId()} RETURNING theme
    `;
    if (!row) {
      return Result.failure(new UserNotFound());
    }
    return Result.ok(row.theme);
  }
}
