import z from "zod";
import { Result } from "@marivo/utils";
import { AppError } from "../../shared/error.ts";
import { type UseCase } from "../../shared/use-case.ts";
import type { Storage } from "../../infra/storage.ts";

export const IMPORTS_BUCKET = "marivo-imports";
export const PRESIGNED_URL_EXPIRES_IN_SECONDS = 900; // 15 min

export class InvalidStorageKeyError extends AppError {
  constructor(key: string) {
    super(`Invalid storage key: "${key}"`, "BAD_REQUEST");
  }
}

export const GetPresignedUrlUseCaseInputSchema = z.object({
  importId: z.uuidv4(),
  key: z.string().min(1).max(1024),
  operation: z.enum(["download", "upload"]),
});

export const GetPresignedUrlUseCaseOutputSchema = z.object({
  url: z.string(),
  expiresAt: z.date(),
});

type GetPresignedUrlUseCaseInput = z.infer<typeof GetPresignedUrlUseCaseInputSchema>;
type GetPresignedUrlUseCaseOutput = z.infer<typeof GetPresignedUrlUseCaseOutputSchema>;

/**
 * Returns a short-lived presigned S3 url for one object of the imports
 * bucket. The key is scoped to `marivo-imports/<importId>/...` so a worker
 * can only touch its own import's files.
 */
export class GetPresignedUrlUseCase implements UseCase<{
  params: GetPresignedUrlUseCaseInput;
  success: GetPresignedUrlUseCaseOutput;
  failure: InvalidStorageKeyError;
}> {
  constructor(storage: Storage) {
    this.storage = storage;
  }

  async execute(
    params: GetPresignedUrlUseCaseInput,
  ): Promise<Result<GetPresignedUrlUseCaseOutput, InvalidStorageKeyError>> {
    const { importId, key, operation } = params;
    // Reject traversal / absolute paths: the object key must stay under
    // <importId>/ inside the imports bucket
    if (
      key.startsWith("/") ||
      key.split("/").some((segment) => segment === ".." || segment === "")
    ) {
      return Result.failure(new InvalidStorageKeyError(key));
    }
    const objectKey = `${importId}/${key}`;
    const url =
      operation === "download"
        ? await this.storage.presignDownload(
            IMPORTS_BUCKET,
            objectKey,
            PRESIGNED_URL_EXPIRES_IN_SECONDS,
          )
        : await this.storage.presignUpload(
            IMPORTS_BUCKET,
            objectKey,
            PRESIGNED_URL_EXPIRES_IN_SECONDS,
          );
    return Result.ok({
      url,
      expiresAt: new Date(Date.now() + PRESIGNED_URL_EXPIRES_IN_SECONDS * 1000),
    });
  }

  private storage: Storage;
}
