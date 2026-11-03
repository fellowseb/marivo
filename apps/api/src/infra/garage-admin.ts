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
): Promise<T> {
  const res = await fetch(`${adminUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    throw new Error(`Garage admin API ${path} failed: ${res.status} ${await res.text()}`);
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
