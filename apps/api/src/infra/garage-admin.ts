/**
 * Minimal client for the Garage admin API (v2), used to auto-provision
 * an access key and the imports bucket on first boot.
 */

export interface GarageKey {
  accessKeyId: string;
  secretAccessKey: string;
}

async function adminFetch<T>(
  adminUrl: string,
  adminToken: string,
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(`${adminUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    throw new Error(`Garage admin API ${method} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export function createGarageKey(
  adminUrl: string,
  adminToken: string,
  name: string,
): Promise<GarageKey> {
  // allow.createBucket lets the provisioned key create buckets over S3
  return adminFetch<GarageKey>(adminUrl, adminToken, "/v2/CreateKey", {
    name,
    neverExpires: true,
    allow: { createBucket: true },
  });
}

/** Looks up a bucket id by global alias. */
export function getBucketIdByAlias(
  adminUrl: string,
  adminToken: string,
  alias: string,
): Promise<string> {
  return adminFetch<{ id: string }>(
    adminUrl,
    adminToken,
    `/v2/GetBucketInfo?globalAlias=${encodeURIComponent(alias)}`,
    undefined,
    "GET",
  ).then((res) => res.id);
}

/** Grants a key read/write/owner access to an existing bucket. */
export function allowBucketKey(
  adminUrl: string,
  adminToken: string,
  bucketId: string,
  accessKeyId: string,
): Promise<void> {
  return adminFetch(adminUrl, adminToken, "/v2/AllowBucketKey", {
    bucketId,
    accessKeyId,
    permissions: { read: true, write: true, owner: true },
  }).then(() => undefined);
}
