import { InternalServerError } from "../shared/error.ts";
import { getConfig } from "./config.ts";
import { GetObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

export class Storage {
  constructor() {
    const { garage } = getConfig();
    this.client = new S3Client({
      region: "garage",
      endpoint: garage.endpoint,
      credentials: {
        accessKeyId: garage.accessKey,
        secretAccessKey: garage.secretKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Upload a file to storage.
   */
  async upload(bucket: "marivo-imports", path: string, body: ReadableStream) {
    console.log(`[storage] uploading to ${bucket} ${path}`);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: path,
        Body: body,
      },
    });
    await upload.done();
    console.log(`[storage] upload done !`);
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

  async initBucket(bucketName: string) {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: bucketName,
        }),
      );
    } catch (err) {
      console.error(err);
      // this.client.send(
      //   new CreateBucketCommand({
      //     Bucket: bucketName,
      //   }),
      // );
    }
  }

  private client: S3Client;
}

let instance: Storage;

export async function initStorage() {
  instance = new Storage();
  await instance.initBucket("marivo-imports");
}

export function getStorage() {
  if (!instance) {
    throw new InternalServerError("Storage not initialized");
  }
  return instance;
}
