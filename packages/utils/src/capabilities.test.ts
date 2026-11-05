import { describe, it, expect } from "vitest";
import {
  ROLES,
  CAPABILITIES,
  ROLE_CAPABILITIES,
  parseRole,
  hasCapability,
  type Capability,
} from "./capabilities.ts";

describe("parseRole", () => {
  it("accepts known roles", () => {
    expect(parseRole("admin")).toBe("admin");
    expect(parseRole("collection-maintainer")).toBe("collection-maintainer");
  });

  it("rejects unknown or non-string values", () => {
    expect(parseRole("superadmin")).toBeUndefined();
    expect(parseRole("")).toBeUndefined();
    expect(parseRole(undefined)).toBeUndefined();
    expect(parseRole(null)).toBeUndefined();
    expect(parseRole(42)).toBeUndefined();
    expect(parseRole({ role: "admin" })).toBeUndefined();
  });
});

describe("hasCapability", () => {
  it("grants every capability to admin (bypass)", () => {
    for (const capability of CAPABILITIES) {
      expect(hasCapability("admin", capability)).toBe(true);
    }
  });

  it("grants the collection capabilities to collection-maintainer", () => {
    expect(hasCapability("collection-maintainer", "create_collection_play")).toBe(true);
    expect(hasCapability("collection-maintainer", "edit_collection_play_metadata")).toBe(true);
    expect(hasCapability("collection-maintainer", "edit_collection_play_script")).toBe(true);
    expect(hasCapability("collection-maintainer", "delete_collection_play")).toBe(true);
  });

  it("denies everything when there is no role", () => {
    for (const capability of CAPABILITIES) {
      expect(hasCapability(undefined, capability)).toBe(false);
    }
  });

  it("keeps ROLE_CAPABILITIES in sync with ROLES and CAPABILITIES", () => {
    expect(Object.keys(ROLE_CAPABILITIES).sort()).toEqual([...ROLES].sort());
    for (const capabilities of Object.values(ROLE_CAPABILITIES)) {
      for (const capability of capabilities) {
        expect(CAPABILITIES).toContain(capability);
      }
    }
    // admin maps to the full list (by reference, so future capabilities flow through)
    expect(ROLE_CAPABILITIES.admin).toEqual(CAPABILITIES);
    expect(ROLE_CAPABILITIES.admin).toHaveLength(CAPABILITIES.length);
  });

  it("type-level: Capability only accepts declared capabilities", () => {
    const capability: Capability = "create_collection_play";
    expect(CAPABILITIES).toContain(capability);
  });
});
