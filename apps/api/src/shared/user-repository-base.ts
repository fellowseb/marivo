import type { TransactionSql } from 'postgres';
import { UserContextService } from './use-case.ts';

export abstract class UserRepositoryBase {
  public constructor(sql: TransactionSql, userContext: UserContextService) {
    this.sql = sql;
    this.userContext = userContext;
  }
  protected userId() {
    return this.userContext.get().userId;
  }
  protected sql: TransactionSql;
  private userContext: UserContextService;
}
