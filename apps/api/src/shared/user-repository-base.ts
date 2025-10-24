import type { Sql } from 'postgres';
import { UserContextService } from './use-case.ts';

export abstract class UserRepositoryBase {
  public constructor(sql: Sql, userContext: UserContextService) {
    this.sql = sql;
    this.userContext = userContext;
  }
  protected userId() {
    return this.userContext.get().userId;
  }
  protected sql: Sql;
  private userContext: UserContextService;
}
