import { describe, it, expect } from "vitest";
import {
  ASSIGNABLE_PLAY_ROLES,
  PLAY_PERMISSIONS,
  PLAY_ROLES,
  PLAY_ROLE_PERMISSIONS,
  isAssignablePlayRole,
  isPlayRole,
  playRolePermissions,
} from "./play-roles.ts";

describe("play roles", () => {
  it("every role has a full permission matrix covering all permissions", () => {
    for (const role of PLAY_ROLES) {
      const matrix = PLAY_ROLE_PERMISSIONS[role];
      expect(Object.keys(matrix).sort()).toEqual([...PLAY_PERMISSIONS].sort());
    }
  });

  it("owner and admin have all permissions", () => {
    expect(Object.values(playRolePermissions("owner")).every(Boolean)).toBe(true);
    expect(Object.values(playRolePermissions("admin")).every(Boolean)).toBe(true);
  });

  it("viewer can read but not write; guest is the most restricted", () => {
    const viewer = playRolePermissions("viewer");
    expect(viewer.scriptRead).toBe(true);
    expect(viewer.scriptWrite).toBe(false);
    expect(viewer.settingsWrite).toBe(false);
    expect(viewer.settingsRead).toBe(true);

    const guest = playRolePermissions("guest");
    expect(guest.scriptRead).toBe(true);
    expect(guest.stagingNotesRead).toBe(false);
    expect(guest.settingsRead).toBe(false);
  });

  it("editor can write the script but not settings", () => {
    const editor = playRolePermissions("editor");
    expect(editor.scriptWrite).toBe(true);
    expect(editor.settingsWrite).toBe(false);
    expect(editor.settingsRead).toBe(true);
  });

  it("isPlayRole / isAssignablePlayRole", () => {
    expect(isPlayRole("owner")).toBe(true);
    expect(isPlayRole("Comedian")).toBe(false);
    expect(isAssignablePlayRole("editor")).toBe(true);
    expect(isAssignablePlayRole("owner")).toBe(false);
    expect(ASSIGNABLE_PLAY_ROLES).not.toContain("owner");
  });
});
