import type { Request } from 'express';
import type { AppError } from './error.ts';
import type { Result } from './result.ts';
import type { LegitAny } from './types.ts';

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
  TUseCaseTypeParams extends {
    params?: unknown;
    success?: unknown;
    failure?: AppError;
  },
> {
  execute: (
    params: TUseCaseTypeParams['params'],
  ) => Promise<
    Result<TUseCaseTypeParams['success'], TUseCaseTypeParams['failure']>
  >;
}

export type AnyUseCase = UseCase<{
  params: LegitAny;
  success: LegitAny;
  failure: AppError;
}>;
