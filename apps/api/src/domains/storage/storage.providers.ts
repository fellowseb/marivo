import type { Provider } from "../../shared/provider.ts";
import { getStorage } from "../../infra/storage.ts";
import { GetPresignedUrlUseCase } from "./get-presigned-url.use-case.ts";

export const providers = {
  GetPresignedUrl: {
    instantiate() {
      return new GetPresignedUrlUseCase(getStorage());
    },
  } as Provider<GetPresignedUrlUseCase>,
};
