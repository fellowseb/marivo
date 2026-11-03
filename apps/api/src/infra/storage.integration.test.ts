import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { loadConfig } from "./config.ts";
import { getStorage, IMPORTS_BUCKET, initStorage } from "./storage.ts";

/**
 * First-boot provisioning against a real Garage container: with no access
 * keys configured, the API creates a key + the imports bucket via the admin
 * API, then can upload/download objects with the provisioned key.
 */
describe("storage first-boot provisioning (real Garage)", () => {
  let container: StartedTestContainer;
  let adminToken: string;
  let adminUrl: string;

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
[s3_web]
bind_addr = "0.0.0.0:3902"
root_domain = ".web.garage.localhost"
index = "index.html"
[k2v_api]
api_bind_addr = "0.0.0.0:3904"
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
      // host-port probing proved flaky here; wait on the startup log instead
      .withWaitStrategy(Wait.forLogMessage("Admin API server listening", 1))
      .start();
    adminUrl = `http://localhost:${container.getMappedPort(3903)}`;
    // Wait until the admin API answers
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
  }, 180_000);

  afterAll(async () => {
    await container?.stop();
  });

  it("provisions key + bucket on first boot and round-trips an object", async () => {
    const config = loadConfig({
      env: {
        GARAGE_ENDPOINT: `http://localhost:${container.getMappedPort(3900)}`,
        GARAGE_ADMIN_URL: adminUrl,
        GARAGE_ADMIN_TOKEN: adminToken,
        // no GARAGE_ACCESS_KEY / GARAGE_SECRET_KEY -> auto-provision
      },
      nodeEnv: "test",
    });

    await initStorage(config);
    const storage = getStorage();

    // Bucket was created by provisioning: readiness probe passes
    await expect(storage.ping()).resolves.toBe(true);

    await storage.upload(
      IMPORTS_BUCKET,
      "provisioning-test/hello.txt",
      Readable.from(["hello world"]) as unknown as ReadableStream,
    );
    const stream = await storage.download(IMPORTS_BUCKET, "provisioning-test/hello.txt");
    let data = "";
    for await (const chunk of stream) {
      data += chunk;
    }
    expect(data).toBe("hello world");
  }, 60_000);
});
