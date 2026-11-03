import type { IncomingHttpHeaders } from "node:http";
import { Result } from "@marivo/utils";
import { AuthenticatedUseCase, UserContextService } from "../../shared/use-case.ts";
import { AppError } from "../../shared/error.ts";
import type { ScriptImportsRepository } from "./script-imports.repository.ts";
import type { Storage } from "../../infra/storage.ts";
import type { MessageBroker } from "../../infra/message-broker.ts";

const HEADER_X_MARIVO_IMPORT_ID = "x-marivo-import-id";
const HEADER_X_MARIVO_IMPORT_FILE_ID = "x-marivo-import-file-id";

export class MissingHeaderError extends AppError {
  constructor(header: string) {
    super(`Expected ${header} header`, "BAD_REQUEST");
  }
}

type UploadFileForScriptImportUseCaseInput = ReadableStream;

export class UploadFileForScriptImportUseCase extends AuthenticatedUseCase<{
  failure: MissingHeaderError;
}> {
  constructor(
    userContext: UserContextService,
    scriptImportsRepository: ScriptImportsRepository,
    storage: Storage,
    broker: MessageBroker,
  ) {
    super(userContext);
    this.scriptImportsRepository = scriptImportsRepository;
    this.storage = storage;
    this.broker = broker;
  }

  async execute(input: UploadFileForScriptImportUseCaseInput, headers: IncomingHttpHeaders) {
    const importId = headers[HEADER_X_MARIVO_IMPORT_ID];
    if (typeof importId !== "string") {
      return Result.failure(new MissingHeaderError(HEADER_X_MARIVO_IMPORT_ID));
    }
    const fileId = headers[HEADER_X_MARIVO_IMPORT_FILE_ID];
    if (typeof fileId !== "string") {
      return Result.failure(new MissingHeaderError(HEADER_X_MARIVO_IMPORT_FILE_ID));
    }
    const path = `${importId}/${fileId}`;
    const stream = input;
    await this.storage.upload("marivo-imports", path, stream);
    const { readyToProcess } = await this.scriptImportsRepository.fileUploaded({
      importId,
      fileId,
    });
    if (readyToProcess) {
      const filesResult =
        await this.scriptImportsRepository.getScriptImportFilesForProcessing(importId);
      const { files } = filesResult.dataOrThrow();
      await this.broker.publish("process-script-text-files", {
        importId,
        files: Object.keys(files),
      });
    }
    return Result.ok(undefined);
  }

  private scriptImportsRepository: ScriptImportsRepository;
  private storage: Storage;
  private broker: MessageBroker;
}
