/**
 * Instance-level roles and capabilities.
 *
 * Roles are stored in the Clerk user's public metadata (`public_metadata.role`)
 * and carried in the session-token `metadata` claim; they are validated at
 * runtime with `parseRole`. Per-play roles are a different, DB-backed system
 * (see the `roles` / `users_in_plays` tables) and are not modeled here.
 */

export const ROLES = ["admin", "collection-maintainer"] as const;
export type Role = (typeof ROLES)[number];

export const CAPABILITIES = [
  "create_collection_play",
  "edit_collection_play_metadata",
  "edit_collection_play_script",
  "delete_collection_play",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/**
 * Hardcoded role => capabilities mapping. `admin` is a bypass role and maps to
 * the whole CAPABILITIES list, so capabilities added later are automatically
 * granted to admin.
 */
export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  admin: CAPABILITIES,
  "collection-maintainer": [
    "create_collection_play",
    "edit_collection_play_metadata",
    "edit_collection_play_script",
    "delete_collection_play",
  ],
};

/** Runtime-validate an untrusted role value (session claim / public metadata). */
export function parseRole(value: unknown): Role | undefined {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
    ? (value as Role)
    : undefined;
}

export function hasCapability(role: Role | undefined, capability: Capability): boolean {
  if (role === undefined) {
    return false;
  }
  return ROLE_CAPABILITIES[role].includes(capability);
}
