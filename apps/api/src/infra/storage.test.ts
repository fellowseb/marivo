import { describe, it, expect, vi, afterEach } from "vitest";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { IMPORTS_BUCKET, initStorage, Storage } from "./storage.ts";
import { loadConfig } from "./config.ts";

function makeConfig(overrides: Record<string, string> = {}) {
  return loadConfig({ env: overrides, nodeEnv: "test" });
}

function fakeS3Client(headBucketError?: unknown) {
  const send = vi.fn().mockImplementation((cmd: unknown) => {
    if (cmd instanceof HeadBucketCommand) {
      if (headBucketError) return Promise.reject(headBucketError);
      return Promise.resolve({});
    }
    return Promise.resolve({});
  });
  return { client: { send } as unknown as S3Client, send };
}

const notFound = () =>
  Object.assign(new Error("nf"), { name: "NotFound", $metadata: { httpStatusCode: 404 } });

function stubAdminApi() {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url.endsWith("/v2/CreateKey")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessKeyId: "GKnew", secretAccessKey: "sekret" }),
          text: async () => "",
        };
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    }),
  );
  return calls;
}

describe("initStorage first-boot provisioning", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a key via the admin API when access keys are empty, then creates the bucket over S3", async () => {
    const calls = stubAdminApi();
    const { client, send } = fakeS3Client(notFound());

    const config = makeConfig({
      GARAGE_ENDPOINT: "http://garage.test:3900",
      GARAGE_ADMIN_URL: "http://garage.test:3903",
      GARAGE_ADMIN_TOKEN: "tok",
      // no GARAGE_ACCESS_KEY / GARAGE_SECRET_KEY
    });
    await initStorage(config, client);

    // Only the key is provisioned via the admin API
    const urls = calls.map((c) => c.url);
    expect(urls).toEqual(["http://garage.test:3903/v2/CreateKey"]);
    // Bucket is created over S3 with the provisioned key
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(CreateBucketCommand);
  });

  it("does not call the admin API when access keys are configured and the bucket exists", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = fakeS3Client();

    const config = makeConfig({
      GARAGE_ACCESS_KEY: "GKexisting",
      GARAGE_SECRET_KEY: "sekret",
      GARAGE_ADMIN_TOKEN: "tok",
    });
    await initStorage(config, client);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a typed error when no keys and no admin token are configured", async () => {
    const config = makeConfig({});
    await expect(initStorage(config)).rejects.toThrow(/GARAGE_ADMIN_TOKEN/);
  });
});

describe("Storage.ensureBucket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rethrows non-404/403 errors without creating", async () => {
    const { client, send } = fakeS3Client(
      Object.assign(new Error("boom"), { $metadata: { httpStatusCode: 500 } }),
    );
    const storage = new Storage({
      endpoint: "http://x",
      accessKeyId: "GK",
      secretAccessKey: "s",
      client,
    });
    await expect(storage.ensureBucket(IMPORTS_BUCKET)).rejects.toThrow("boom");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("grants access via the admin API on 403 (existing bucket, new key)", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        calls.push(url);
        if (url.includes("GetBucketInfo")) {
          return { ok: true, status: 200, json: async () => ({ id: "bid-9" }), text: async () => "" };
        }
        return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
      }),
    );
    const { client } = fakeS3Client(
      Object.assign(new Error("forbidden"), { name: "Forbidden", $metadata: { httpStatusCode: 403 } }),
    );
    const storage = new Storage({
      endpoint: "http://x",
      accessKeyId: "GKnew",
      secretAccessKey: "s",
      client,
    });
    await storage.ensureBucket(IMPORTS_BUCKET, { adminUrl: "http://admin", adminToken: "tok" });
    expect(calls.some((u) => u.includes("GetBucketInfo?globalAlias=marivo-imports"))).toBe(true);
    expect(calls.some((u) => u.endsWith("/v2/AllowBucketKey"))).toBe(true);
  });
});
