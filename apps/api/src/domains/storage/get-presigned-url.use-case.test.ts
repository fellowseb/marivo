import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GetPresignedUrlUseCase,
  GetPresignedUrlUseCaseInputSchema,
  InvalidStorageKeyError,
} from "./get-presigned-url.use-case.ts";
import type { Storage } from "../../infra/storage.ts";

const IMPORT_ID = "550e8400-e29b-41d4-a716-446655440000";

function fakeStorage() {
  return {
    presignDownload: vi.fn().mockResolvedValue("https://s3/GET/presigned"),
    presignUpload: vi.fn().mockResolvedValue("https://s3/PUT/presigned"),
  } as unknown as Storage & {
    presignDownload: ReturnType<typeof vi.fn>;
    presignUpload: ReturnType<typeof vi.fn>;
  };
}

describe("GetPresignedUrlUseCase", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let useCase: GetPresignedUrlUseCase;

  beforeEach(() => {
    storage = fakeStorage();
    useCase = new GetPresignedUrlUseCase(storage);
  });

  it("presigns a download url scoped to the import prefix", async () => {
    const result = await useCase.execute({
      importId: IMPORT_ID,
      key: "files/script.txt",
      operation: "download",
    });

    expect(result.isOk()).toBe(true);
    const ok = result.dataOrThrow();
    expect(ok.url).toBe("https://s3/GET/presigned");
    expect(ok.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(storage.presignDownload).toHaveBeenCalledWith(
      "marivo-imports",
      `${IMPORT_ID}/files/script.txt`,
      expect.any(Number),
    );
    expect(storage.presignUpload).not.toHaveBeenCalled();
  });

  it("presigns an upload url", async () => {
    const result = await useCase.execute({
      importId: IMPORT_ID,
      key: "result-lines.csv",
      operation: "upload",
    });

    expect(result.isOk()).toBe(true);
    expect(storage.presignUpload).toHaveBeenCalledWith(
      "marivo-imports",
      `${IMPORT_ID}/result-lines.csv`,
      expect.any(Number),
    );
  });

  it.each(["../other-import/file.txt", "a/../../etc/passwd", "/absolute/path", "a//b"])(
    "rejects path traversal key %j",
    async (key) => {
      const result = await useCase.execute({ importId: IMPORT_ID, key, operation: "download" });

      expect(result.isFailure()).toBe(true);
      const error = result.errorOrThrow();
      expect(error).toBeInstanceOf(InvalidStorageKeyError);
      expect(error.code).toBe("BAD_REQUEST");
      expect(storage.presignDownload).not.toHaveBeenCalled();
    },
  );

  it("input schema rejects a non-uuid importId", () => {
    const parsed = GetPresignedUrlUseCaseInputSchema.safeParse({
      importId: "not-a-uuid",
      key: "file.txt",
      operation: "download",
    });
    expect(parsed.success).toBe(false);
  });
});
