import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MissingHeaderError,
  UploadFileForScriptImportUseCase,
} from "./upload-file-for-script-import.use-case.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { Storage } from "../../infra/storage.ts";
import type { MessageBroker } from "../../infra/message-broker.ts";
import type { UserContextService } from "../../shared/use-case.ts";

function mockUserService(): UserContextService {
  return { get: () => ({ userId: 1 }) } as unknown as UserContextService;
}

describe("UploadFileForScriptImportUseCase", () => {
  let scriptImportsRepository: vi.Mocked<ScriptImportsRepository>;
  let storage: vi.Mocked<Storage>;
  let broker: vi.Mocked<MessageBroker>;
  let useCase: UploadFileForScriptImportUseCase;

  beforeEach(() => {
    scriptImportsRepository = {
      fileUploaded: vi.fn(),
      getScriptImportFilesForProcessing: vi.fn(),
    } as unknown as vi.Mocked<ScriptImportsRepository>;
    storage = { upload: vi.fn() } as unknown as vi.Mocked<Storage>;
    broker = { publish: vi.fn() } as unknown as vi.Mocked<MessageBroker>;
    useCase = new UploadFileForScriptImportUseCase(
      mockUserService(),
      scriptImportsRepository,
      storage,
      broker,
    );
  });

  it("returns a BAD_REQUEST failure Result when the import id header is missing", async () => {
    const result = await useCase.execute(
      ReadableStream.from([]) as unknown as ReadableStream,
      {},
    );

    expect(result.isFailure()).toBe(true);
    const error = result.errorOrThrow();
    expect(error).toBeInstanceOf(MissingHeaderError);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.httpStatus()).toBe(400);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("returns a BAD_REQUEST failure Result when the file id header is missing", async () => {
    const result = await useCase.execute(ReadableStream.from([]) as unknown as ReadableStream, {
      "x-marivo-import-id": "import-1",
    });

    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });

  it("uploads the file and returns ok when headers are present", async () => {
    storage.upload.mockResolvedValue(undefined as never);
    scriptImportsRepository.fileUploaded.mockResolvedValue({ readyToProcess: false });

    const result = await useCase.execute(ReadableStream.from([]) as unknown as ReadableStream, {
      "x-marivo-import-id": "import-1",
      "x-marivo-import-file-id": "file-1",
    });

    expect(result.isOk()).toBe(true);
    expect(storage.upload).toHaveBeenCalledWith("marivo-imports", "import-1/file-1", expect.anything());
    expect(broker.publish).not.toHaveBeenCalled();
  });
});
