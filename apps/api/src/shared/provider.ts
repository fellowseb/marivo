import type { Request } from 'express';
import type { TransactionSql } from 'postgres';

interface ProviderContext {
  req: Request;
  sql: TransactionSql;
}

export interface Provider<T> {
  instantiate: (context: ProviderContext) => T;
}

export function staticProvider<T>(instance: T): Provider<T> {
  return {
    instantiate: () => instance,
  };
}
