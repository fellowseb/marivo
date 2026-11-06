import type { APIRequestContext, Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const CLERK_API = "https://api.clerk.com/v1";

export interface E2eUser {
  id: string;
  email: string;
  password: string;
}

function clerkHeaders(): Record<string, string> {
  const secret = process.env.E2E_CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("E2E_CLERK_SECRET_KEY is not set");
  }
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

/** Creates a fresh Clerk user for this run (deleted again by deleteE2eUser). */
export async function createE2eUser(request: APIRequestContext): Promise<E2eUser> {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = `E2e-${randomUUID()}-Aa1`;
  const res = await request.post(`${CLERK_API}/users`, {
    headers: clerkHeaders(),
    data: { email_address: [email], password },
  });
  if (!res.ok()) {
    throw new Error(`Clerk create user failed: ${res.status()} ${await res.text()}`);
  }
  const user = (await res.json()) as { id: string };
  return { id: user.id, email, password };
}

/** Deletes the per-run Clerk user (call in a finally block). */
export async function deleteE2eUser(request: APIRequestContext, userId: string): Promise<void> {
  const res = await request.delete(`${CLERK_API}/users/${userId}`, {
    headers: clerkHeaders(),
  });
  if (!res.ok() && res.status() !== 404) {
    console.error(`Clerk delete user failed: ${res.status()} ${await res.text()}`);
  }
}

/**
 * Signs in with a per-run user: creates it, inserts the matching `users` DB
 * row (the API maps clerk users to DB rows by clerk_id), sets
 * public_metadata.userDbId so the session JWT carries the claim the API
 * middleware requires (the Clerk instance's session-token template must map
 * `userDbId` from public metadata), then signs in through the Clerk UI.
 *
 * Returns the user so the caller can delete it in a finally block.
 */
export async function signIn(page: Page, request: APIRequestContext): Promise<E2eUser> {
  const user = await createE2eUser(request);

  const container = process.env.E2E_POSTGRES_CONTAINER ?? "marivo-postgres-1";
  const psql = (sql: string) =>
    execFileSync(
      "docker",
      ["exec", container, "psql", "-U", "postgres", "-d", "marivo", "-t", "-A", "-c", sql],
      { encoding: "utf8" },
    ).trim();
  psql(
    `INSERT INTO users (clerk_id, username, full_name, primary_email) VALUES ('${user.id}', 'e2e-${randomUUID().slice(0, 8)}', 'E2E Test', '${user.email}') ON CONFLICT (clerk_id) DO NOTHING`,
  );
  const dbId = psql(`SELECT id FROM users WHERE clerk_id = '${user.id}'`);
  if (!/^\d+$/.test(dbId)) {
    throw new Error(`No users row for clerk_id ${user.id} (got "${dbId}")`);
  }

  const patchRes = await request.patch(`${CLERK_API}/users/${user.id}`, {
    headers: clerkHeaders(),
    data: { public_metadata: { userDbId: Number(dbId) } },
  });
  if (!patchRes.ok()) {
    throw new Error(
      `Clerk set public_metadata failed: ${patchRes.status()} ${await patchRes.text()}`,
    );
  }

  await page.goto("/signin");
  await page.getByRole("textbox", { name: "Email address" }).fill(user.email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByPlaceholder("Enter your password").fill(user.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), { timeout: 30_000 });

  return user;
}
