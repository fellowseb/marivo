/**
 * In-play roles (RBAC for play participants). The permission matrix is
 * hardcoded here: each role maps to a fixed set of permissions. "owner" is
 * implicit (the play's creator) and always bypasses permission checks.
 */
export const PLAY_PERMISSIONS = [
  "scriptRead",
  "scriptWriteSharedDrafts",
  "scriptWrite",
  "stagingNotesRead",
  "stagingNotesWrite",
  "blockingRead",
  "blockingWrite",
  "memorizeRead",
  "planningRead",
  "planningWrite",
  "settingsRead",
  "settingsWrite",
] as const;
export type PlayPermission = (typeof PLAY_PERMISSIONS)[number];

export type PlayPermissions = Record<PlayPermission, boolean>;

export const PLAY_ROLES = ["owner", "admin", "editor", "viewer", "guest"] as const;
export type PlayRole = (typeof PLAY_ROLES)[number];

/** Roles that can be assigned to a participant (owner is implicit). */
export const ASSIGNABLE_PLAY_ROLES = ["admin", "editor", "viewer", "guest"] as const;
export type AssignablePlayRole = (typeof ASSIGNABLE_PLAY_ROLES)[number];

const ALL_TRUE = Object.fromEntries(PLAY_PERMISSIONS.map((p) => [p, true])) as PlayPermissions;
const ALL_FALSE = Object.fromEntries(PLAY_PERMISSIONS.map((p) => [p, false])) as PlayPermissions;

function withOverrides(
  base: PlayPermissions,
  overrides: Partial<PlayPermissions>,
): PlayPermissions {
  return { ...base, ...overrides };
}

/** The role => permission matrix. Owner bypasses checks entirely. */
export const PLAY_ROLE_PERMISSIONS: Record<PlayRole, PlayPermissions> = {
  owner: ALL_TRUE,
  admin: ALL_TRUE,
  editor: withOverrides(ALL_FALSE, {
    scriptRead: true,
    scriptWriteSharedDrafts: true,
    scriptWrite: true,
    stagingNotesRead: true,
    stagingNotesWrite: true,
    blockingRead: true,
    blockingWrite: true,
    memorizeRead: true,
    planningRead: true,
    planningWrite: true,
    settingsRead: true,
  }),
  viewer: withOverrides(ALL_FALSE, {
    scriptRead: true,
    stagingNotesRead: true,
    blockingRead: true,
    memorizeRead: true,
    planningRead: true,
    settingsRead: true,
  }),
  guest: withOverrides(ALL_FALSE, {
    scriptRead: true,
    memorizeRead: true,
  }),
};

export function isPlayRole(value: unknown): value is PlayRole {
  return typeof value === "string" && (PLAY_ROLES as readonly string[]).includes(value);
}

export function isAssignablePlayRole(value: unknown): value is AssignablePlayRole {
  return typeof value === "string" && (ASSIGNABLE_PLAY_ROLES as readonly string[]).includes(value);
}

export function playRolePermissions(role: PlayRole): PlayPermissions {
  return PLAY_ROLE_PERMISSIONS[role];
}
