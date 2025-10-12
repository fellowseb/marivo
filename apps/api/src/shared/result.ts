import type { LegitAny } from './types.ts';

interface ResultInternals<TSuccess, TFailure> {
  type: 'success' | 'failure';
  dataOrThrow: () => TSuccess;
  errorOrThrow: () => TFailure;
}

class Success<TSuccess, TFailure>
  implements ResultInternals<TSuccess, TFailure>
{
  constructor(data: TSuccess) {
    this.data = data;
  }
  data: TSuccess;
  type = 'success' as const;
  dataOrThrow(): TSuccess {
    return this.data;
  }
  errorOrThrow(): TFailure {
    throw new Error('Unexpected Result failure');
  }
}

class Failure<TSuccess, TFailure>
  implements ResultInternals<TSuccess, TFailure>
{
  constructor(data: TFailure) {
    this.data = data;
  }
  data: TFailure;
  type = 'failure' as const;
  dataOrThrow(): TSuccess {
    throw new Error('Unexpected Result success');
  }
  errorOrThrow(): TFailure {
    return this.data;
  }
}

export class Result<TSuccess, TFailure> {
  static ok<TSuccess>(data: TSuccess) {
    return new Result(new Success<TSuccess, LegitAny>(data));
  }

  static failure<TFailure>(data: TFailure) {
    return new Result(new Failure<LegitAny, TFailure>(data));
  }

  public isOk(): boolean {
    return this.internals.type === 'success';
  }

  public isFailure(): boolean {
    return this.internals.type === 'failure';
  }

  public match<T>(matchers: {
    success: (data: TSuccess) => T;
    failure: (data: TFailure) => T;
  }) {
    switch (this.internals.type) {
      case 'success':
        return matchers.success(this.internals.dataOrThrow());
      case 'failure':
        return matchers.failure(this.internals.errorOrThrow());
      default:
        throw new Error('Unexpected Result case');
    }
  }

  public dataOrThrow(): TSuccess {
    return this.internals.dataOrThrow();
  }

  public errorOrThrow(): TFailure {
    return this.internals.errorOrThrow();
  }

  private constructor(internals: ResultInternals<TSuccess, TFailure>) {
    this.internals = internals;
  }

  private internals: ResultInternals<TSuccess, TFailure>;
}
