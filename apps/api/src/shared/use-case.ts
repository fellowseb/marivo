import { type LegitAny, Result } from '@marivo/utils';
import type { Request } from 'express';
import type { AppError } from './error.ts';

export interface AuthenticatedUserContext {
  userId: number;
}

export class UserContextService {
  constructor(req: Request) {
    this.req = req;
  }
  get(): AuthenticatedUserContext {
    return this.req.context;
  }
  private req: Request;
}

export abstract class AuthenticatedUseCase<
  T extends {
    params?: unknown;
    success?: unknown;
    failure?: AppError;
  },
> implements UseCase<T>
{
  constructor(userContextService: UserContextService) {
    this.userContextService = userContextService;
  }

  abstract execute(
    params: T['params'],
  ): Promise<Result<T['success'], T['failure']>>;

  protected getUserContext(): AuthenticatedUserContext {
    return this.userContextService.get();
  }

  private userContextService: UserContextService;
}

export interface UseCase<
  T extends {
    params?: unknown;
    success?: unknown;
    failure?: AppError;
  },
> {
  execute(params: T['params']): Promise<Result<T['success'], T['failure']>>;
}

export type AnyUseCase = UseCase<{
  params: LegitAny;
  success: LegitAny;
  failure: AppError;
}>;

export type ResultOfUseCase<T> =
  T extends UseCase<{
    params: unknown;
    success: infer TSuccess;
    failure: AppError;
  }>
    ? Result<TSuccess, AppError>
    : unknown;

export type ParamsOfUseCase<T> =
  T extends UseCase<{
    params: infer TParams;
    success: unknown;
    failure: AppError;
  }>
    ? TParams
    : unknown;

export type SuccessOfUseCase<T> =
  T extends UseCase<{
    params: unknown;
    success: infer TSuccess;
    failure: AppError;
  }>
    ? TSuccess
    : unknown;
