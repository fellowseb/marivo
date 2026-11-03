import { InternalServerError } from "../shared/error.ts";
import { getConfig, type AppConfig } from "./config.ts";
import { getLogger } from "./logger.ts";
import { allowBucketKey, createGarageKey, getBucketIdByAlias } from "./garage-admin.ts";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

export const IMPORTS_BUCKET = "marivo-imports";

export interface StorageDeps {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Injectable for tests */
  client?: S3Client | undefined;
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { name?: string }).name === "NotFound" ||
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
  );
}

function isForbidden(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { name?: string }).name === "Forbidden" ||
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 403)
  );
}

export class Storage {
  constructor(deps: StorageDeps) {
    this.accessKeyId = deps.accessKeyId;
    this.client =
      deps.client ??
      new S3Client({
        region: "garage",
        endpoint: deps.endpoint,
        credentials: {
          accessKeyId: deps.accessKeyId,
          secretAccessKey: deps.secretAccessKey,
        },
        forcePathStyle: true,
        // Avoid default CRC32 checksum headers: they break presigned PUT urls
        requestChecksumCalculation: "WHEN_REQUIRED",
      });
  }

  /**
   * Upload a file to storage.
   */
  async upload(bucket: "marivo-imports", path: string, body: ReadableStream) {
    getLogger().info({ bucket, path }, "storage upload started");
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: path,
        Body: body,
      },
    });
    await upload.done();
    getLogger().debug({ bucket, path }, "storage upload done");
  }

  async download(bucket: "marivo-imports", path: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
    );
    if (!response.Body) {
      throw new InternalServerError("Response has no body");
    }
    const readable = Readable.fromWeb(response.Body.transformToWebStream(), {
      encoding: "utf8",
    });
    readable.setEncoding("utf8");
    return readable;
  }

  /**
   * Ensure the bucket exists and this key can access it: creates the bucket
   * over S3 when missing (provisioned keys have createBucket permission), and
   * grants access via the admin API when the bucket already exists but the
   * key is not allowed on it (403).
   */
  async ensureBucket(
    bucketName: string,
    admin?: { adminUrl: string; adminToken: string },
  ) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
      return;
    } catch (err) {
      if (isNotFound(err)) {
        await this.client.send(new CreateBucketCommand({ Bucket: bucketName }));
        return;
      }
      if (!isForbidden(err) || !admin?.adminToken) {
        throw err;
      }
    }
    const bucketId = await getBucketIdByAlias(admin.adminUrl, admin.adminToken, bucketName);
    await allowBucketKey(admin.adminUrl, admin.adminToken, bucketId, this.accessKeyId);
  }

  /** Presigned GET url (e.g. for the worker to download an import file). */
  presignDownload(bucket: string, key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /** Presigned PUT url (e.g. for the worker to upload a result file). */
  presignUpload(bucket: string, key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /** Readiness probe: can we reach the S3-compatible storage? */
  async ping(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: IMPORTS_BUCKET }));
      return true;
    } catch {
      return false;
    }
  }

  private client: S3Client;
  private accessKeyId: string;
}

let instance: Storage;

export async function initStorage(config: AppConfig = getConfig(), client?: S3Client) {
  const { garage } = config;
  let accessKeyId = garage.accessKey;
  let secretAccessKey = garage.secretKey;
  // First boot on a fresh instance: provision a key via the admin API
  if (!accessKeyId || !secretAccessKey) {
    if (!garage.adminToken) {
      throw new InternalServerError(
        "Garage access key not configured and GARAGE_ADMIN_TOKEN is missing (cannot auto-provision)",
      );
    }
    const key = await createGarageKey(
      garage.adminUrl,
      garage.adminToken,
      `marivo-api-${new Date().toISOString()}`,
    );
    accessKeyId = key.accessKeyId;
    secretAccessKey = key.secretAccessKey;
  }
  instance = new Storage({
    endpoint: garage.endpoint,
    accessKeyId,
    secretAccessKey,
    client,
  });
  await instance.ensureBucket(IMPORTS_BUCKET, {
    adminUrl: garage.adminUrl,
    adminToken: garage.adminToken,
  });
}

export function getStorage() {
  if (!instance) {
    throw new InternalServerError("Storage not initialized");
  }
  return instance;
}
