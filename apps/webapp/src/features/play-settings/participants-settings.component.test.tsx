import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PLAY_ROLE_PERMISSIONS, Result } from "@marivo/utils";
import ParticipantsSettings from "./participants-settings.component";

const mocks = {
  setParticipantRole: vi.fn(),
  addRole: vi.fn(),
  removeRole: vi.fn(),
  updateRolePermissions: vi.fn(),
};

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...mod,
    useMutation: (opts: unknown) => {
      const key = (opts as { mutationKey?: string[] })?.mutationKey?.[0];
      return { mutate: mocks[key as keyof typeof mocks], isPending: false };
    },
  };
});

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    plays: {
      setParticipantRole: { mutationOptions: () => ({ mutationKey: ["setParticipantRole"] }) },
      addRole: { mutationOptions: () => ({ mutationKey: ["addRole"] }) },
      removeRole: { mutationOptions: () => ({ mutationKey: ["removeRole"] }) },
      updateRolePermissions: {
        mutationOptions: () => ({ mutationKey: ["updateRolePermissions"] }),
      },
      playDetails: { queryKey: () => ["plays", "playDetails"] },
    },
  }),
}));

let mockPlayContext: unknown = null;
vi.mock("../play-admin/play.context", () => ({
  usePlayContext: () => mockPlayContext,
}));

const URI = "10000000-0000-4000-8000-000000000001";

function makePlayContext(overrides?: { isOwner?: boolean; settingsWrite?: boolean }) {
  return Result.ok({
    details: {
      id: 1,
      uri: URI,
      title: "Hamlet",
      createdDate: new Date(),
      lastModifiedDate: new Date(),
      isOwner: overrides?.isOwner ?? true,
      ownerFullName: "Owner One",
      ownerUsername: "owner1",
    },
    permissions: {
      ...PLAY_ROLE_PERMISSIONS.owner,
      settingsWrite: overrides?.settingsWrite ?? true,
    },
    participants: {
      owner1: { fullName: "Owner One", role: "owner", permissions: PLAY_ROLE_PERMISSIONS.owner },
      alice: { fullName: "Alice A", role: "viewer", permissions: PLAY_ROLE_PERMISSIONS.viewer },
    },
    roles: [
      { id: -1, name: "owner", builtin: true, permissions: PLAY_ROLE_PERMISSIONS.owner },
      { id: 1, name: "viewer", builtin: false, permissions: PLAY_ROLE_PERMISSIONS.viewer },
      { id: 2, name: "editor", builtin: false, permissions: PLAY_ROLE_PERMISSIONS.editor },
    ],
  });
}

function renderComponent() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ParticipantsSettings />
    </QueryClientProvider>,
  );
}

describe("ParticipantsSettings", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockClear());
    mockPlayContext = makePlayContext();
  });
  afterEach(() => cleanup());

  it("lists participants with a role select fed by the play's roles; owner row locked", () => {
    renderComponent();
    expect(screen.getByText(/Owner One/)).toBeTruthy();
    expect(screen.queryByLabelText("Role for owner1")).toBeNull();
    const select = screen.getByLabelText("Role for alice") as HTMLSelectElement;
    expect(select.value).toBe("viewer");
    expect([...select.options].map((o) => o.value)).toEqual(["viewer", "editor"]);
  });

  it("matrix header shows all roles with Owner first; owner column has no remove button", () => {
    renderComponent();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getAllByText("viewer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("editor").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Remove role owner")).toBeNull();
    expect(screen.getByLabelText("Remove role viewer")).toBeTruthy();
  });

  it("toggling a permission of a non-owner role calls updateRolePermissions", () => {
    renderComponent();
    // viewer has scriptWrite=false -> the "edit" checkbox in the viewer column
    const checkbox = screen.getAllByLabelText("edit viewer")[0] as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(mocks.updateRolePermissions).toHaveBeenCalledWith({
      uri: URI,
      roleName: "viewer",
      permissions: { ...PLAY_ROLE_PERMISSIONS.viewer, scriptWrite: true },
    });
  });

  it("owner column checkboxes are disabled", () => {
    renderComponent();
    const ownerCheckbox = screen.getAllByLabelText("edit owner")[0] as HTMLInputElement;
    expect(ownerCheckbox.checked).toBe(true);
    expect(ownerCheckbox.disabled).toBe(true);
  });

  it("add role calls addRole with the entered name", () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText("New role name"), {
      target: { value: "Stage manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add role" }));
    expect(mocks.addRole).toHaveBeenCalledWith({ uri: URI, name: "Stage manager" });
  });

  it("remove role calls removeRole", () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText("Remove role editor"));
    expect(mocks.removeRole).toHaveBeenCalledWith({ uri: URI, roleName: "editor" });
  });

  it("assigning a role to a participant calls setParticipantRole", () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText("Role for alice"), { target: { value: "editor" } });
    expect(mocks.setParticipantRole).toHaveBeenCalledWith({
      uri: URI,
      username: "alice",
      role: "editor",
    });
  });

  it("hides all editing when the user cannot manage (not owner, no settingsWrite)", () => {
    mockPlayContext = makePlayContext({ isOwner: false, settingsWrite: false });
    renderComponent();
    expect(screen.queryByLabelText("Role for alice")).toBeNull();
    expect(screen.queryByLabelText("Remove role viewer")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add role" })).toBeNull();
    const checkbox = screen.getAllByLabelText("edit viewer")[0] as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });
});
