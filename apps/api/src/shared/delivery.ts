import type z from 'zod';
import type { Request, RequestHandler, Response } from 'express';
import { Result } from '@marivo/utils';
import type { AnyUseCase } from './use-case.ts';
import type { Provider } from './provider.ts';
import { AppError } from './error.ts';

export function sendSuccessResponse<T>(req: Request, res: Response, data: T) {
  const responseBody = {
    success: true,
    requestId: req.context.requestId,
    data,
  };
  res.status(200).send(responseBody);
}

export function sendFailureResponse(
  req: Request,
  res: Response,
  error: AppError,
) {
  const responseBody = {
    success: false,
    requestId: req.context.requestId,
    error,
  };
  let status;
  switch (error.family) {
    case 'client':
      status = 400;
      break;
    case 'server':
    default:
      status = 500;
      break;
  }
  res.status(status).send(responseBody);
}

interface Class<TConstructor, TArgs extends unknown[] = unknown[]> {
  new (...args: TArgs[]): TConstructor;
}

function validateData<TError extends Error>(
  data: unknown,
  schema: z.Schema,
  ErrorClass: Class<TError>,
): Result<void, TError> {
  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    const err = new ErrorClass();
    err.cause = parseResult.error.message;
    return Result.failure(err);
  }
  return Result.ok(undefined);
}

class InvalidInputParamsError extends AppError {
  constructor() {
    super('Invalid input params', 'INVALID_INPUT_PARAMS', 'client');
  }
}

class InvalidInputPayloadError extends AppError {
  constructor() {
    super('Invalid input payload', 'INVALID_INPUT_PAYLOAD', 'client');
  }
}

class InvalidOutputError extends AppError {
  constructor() {
    super('Invalid use case output format', 'INVALID_INPUT_PARAMS', 'server');
  }
}

class UnexpectedAppError extends AppError {
  constructor() {
    super('Unexpected application error', 'UNEXPECTED_APP_ERROR', 'server');
  }
}

export function useCase<TUseCase extends AnyUseCase>(config: {
  provider: Provider<TUseCase>;
  inputParamsSchema?: z.Schema;
  inputPayloadSchema?: z.Schema;
  outputSchema?: z.Schema;
}): RequestHandler {
  return async (req, res) => {
    try {
      if (config.inputParamsSchema) {
        const result = validateData(
          req.params,
          config.inputParamsSchema,
          InvalidInputParamsError,
        );
        if (result.isFailure()) {
          return sendFailureResponse(req, res, result.errorOrThrow());
        }
      }
      if (config.inputPayloadSchema) {
        const result = validateData(
          req.body,
          config.inputPayloadSchema,
          InvalidInputPayloadError,
        );
        if (result.isFailure()) {
          return sendFailureResponse(req, res, result.errorOrThrow());
        }
      }
      const useCase = config.provider.instantiate(req);
      const outputResult = await useCase.execute(req.params);
      // Validate result
      outputResult.match({
        success: (outputData) => {
          if (config.outputSchema) {
            validateData(
              outputData,
              config.outputSchema,
              InvalidOutputError,
            ).dataOrThrow();
          }
        },
        failure: () => {
          // TODO: validate output errors
        },
      });
      return outputResult.match({
        success: (outputData) => sendSuccessResponse(req, res, outputData),
        failure: (error) => sendFailureResponse(req, res, error),
      });
    } catch (exception) {
      const error = new UnexpectedAppError();
      error.cause = exception;
      console.error(error);
      return sendFailureResponse(req, res, error);
    }
  };
}
