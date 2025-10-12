import type { Request } from 'express';

export interface Provider<T> {
  instantiate: (req: Request) => T;
}

export function staticProvider<T>(instance: T): Provider<T> {
  return {
    instantiate: () => instance,
  };
}
