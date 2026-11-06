import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { getStorage, initStorage } from "../../infra/storage.ts";
import { GetPresignedUrlUseCase, IMPORTS_BUCKET } from "./get-presigned-url.use-case.ts";

const IMPORT_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Presigned URLs against a real Garage container: the worker flow is
 * presign (via the use case) then plain HTTP PUT/GET on the returned URL.
 */
describe("presigned storage urls (real Garage)", () => {
  let container: StartedTestContainer;
  let adminToken: string;
  let s3Endpoint: string;

  beforeAll(async () => {
    adminToken = randomBytes(32).toString("hex");
    const dir = mkdtempSync(join(tmpdir(), "garage-cfg-"));
    writeFileSync(
      join(dir, "garage.toml"),
      `
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "0.0.0.0:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "${randomBytes(32).toString("hex")}"
[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:3900"
[admin]
api_bind_addr = "0.0.0.0:3903"
admin_token = "${adminToken}"
metrics_token = "${randomBytes(32).toString("hex")}"
`,
    );
    container = await new GenericContainer("dxflrs/garage:v2.5.0")
      .withCopyFilesToContainer([{ source: join(dir, "garage.toml"), target: "/etc/garage.toml" }])
      .withCommand(["/garage", "server", "--single-node"])
      .withExposedPorts(3900, 3903)
      .withWaitStrategy(Wait.forLogMessage("Admin API server listening", 1))
      .start();

    const adminUrl = `http://localhost:${container.getMappedPort(3903)}`;
    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        const res = await fetch(`${adminUrl}/v2/ListBuckets`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (res.ok) break;
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) throw new Error("Garage admin API did not come up");
      await new Promise((r) => setTimeout(r, 500));
    }

    // Provision a key (createBucket perm) and the imports bucket for the test
    const keyRes = await fetch(`${adminUrl}/v2/CreateKey`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "presign-test",
        neverExpires: true,
        allow: { createBucket: true },
      }),
    });
    const key = (await keyRes.json()) as { accessKeyId: string; secretAccessKey: string };
    s3Endpoint = `http://localhost:${container.getMappedPort(3900)}`;
    const s3 = new S3Client({
      region: "garage",
      endpoint: s3Endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: key.accessKeyId, secretAccessKey: key.secretAccessKey },
    });
    await s3.send(new CreateBucketCommand({ Bucket: IMPORTS_BUCKET }));

    // Point the API's Storage at the test garage (before getConfig() is first read)
    process.env.GARAGE_ENDPOINT = s3Endpoint;
    process.env.GARAGE_ACCESS_KEY = key.accessKeyId;
    process.env.GARAGE_SECRET_KEY = key.secretAccessKey;
    await initStorage();
  }, 180_000);

  afterAll(async () => {
    await container?.stop();
  });

  it("presigned upload + download urls round-trip an object over plain HTTP", async () => {
    const useCase = new GetPresignedUrlUseCase(getStorage());

    const upload = await useCase.execute({
      importId: IMPORT_ID,
      key: "files/hello.txt",
      operation: "upload",
    });
    expect(upload.isOk()).toBe(true);
    const { url: putUrl, expiresAt } = upload.dataOrThrow();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const putRes = await fetch(putUrl, { method: "PUT", body: "presigned hello" });
    expect(putRes.ok).toBe(true);

    const download = await useCase.execute({
      importId: IMPORT_ID,
      key: "files/hello.txt",
      operation: "download",
    });
    expect(download.isOk()).toBe(true);
    const getRes = await fetch(download.dataOrThrow().url);
    expect(getRes.ok).toBe(true);
    expect(await getRes.text()).toBe("presigned hello");
  }, 60_000);

  it("rejects keys escaping the import prefix", async () => {
    const useCase = new GetPresignedUrlUseCase(getStorage());
    const result = await useCase.execute({
      importId: IMPORT_ID,
      key: "../other/escape.txt",
      operation: "download",
    });
    expect(result.isFailure()).toBe(true);
    expect(result.errorOrThrow().code).toBe("BAD_REQUEST");
  });
});
