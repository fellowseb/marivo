import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PLAY_ROLE_PERMISSIONS, Result } from "@marivo/utils";
import ParticipantsSettings from "./participants-settings.component";

const setParticipantRoleMutate = vi.fn();
const setParticipantPermissionsMutate = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...mod,
    useMutation: (opts: unknown) => {
      const key = (opts as { mutationKey?: string[] })?.mutationKey?.[0];
      return {
        mutate:
          key === "setParticipantPermissions"
            ? setParticipantPermissionsMutate
            : setParticipantRoleMutate,
        isPending: false,
      };
    },
  };
});

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    plays: {
      setParticipantRole: { mutationOptions: () => ({ mutationKey: ["setParticipantRole"] }) },
      setParticipantPermissions: {
        mutationOptions: () => ({ mutationKey: ["setParticipantPermissions"] }),
      },
      playDetails: { queryKey: () => ["plays", "playDetails"] },
    },
  }),
}));

let mockPlayContext: unknown = null;
vi.mock("../play-admin/play.context", () => ({
  usePlayContext: () => mockPlayContext,
}));

function makePlayContext(overrides?: {
  isOwner?: boolean;
  settingsWrite?: boolean;
  participants?: Record<
    string,
    { fullName: string; role: string | null; permissions: typeof PLAY_ROLE_PERMISSIONS.viewer }
  >;
}) {
  return Result.ok({
    details: {
      id: 1,
      uri: "10000000-0000-4000-8000-000000000001",
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
    participants: overrides?.participants ?? {
      owner1: { fullName: "Owner One", role: "owner", permissions: PLAY_ROLE_PERMISSIONS.owner },
      alice: { fullName: "Alice A", role: "viewer", permissions: PLAY_ROLE_PERMISSIONS.viewer },
    },
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
    setParticipantRoleMutate.mockClear();
    setParticipantPermissionsMutate.mockClear();
    mockPlayContext = makePlayContext();
  });
  afterEach(() => cleanup());

  it("lists participants with their roles; the owner role is not editable", () => {
    renderComponent();
    expect(screen.getByText(/Owner One/)).toBeTruthy();
    expect(screen.getByText(/Alice A/)).toBeTruthy();
    expect(screen.queryByLabelText("Role for owner1")).toBeNull();
    const select = screen.getByLabelText("Role for alice") as HTMLSelectElement;
    expect(select.value).toBe("viewer");
  });

  it("assigning a role calls setParticipantRole with uri, username and role", () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText("Role for alice"), { target: { value: "editor" } });
    expect(setParticipantRoleMutate).toHaveBeenCalledWith({
      uri: "10000000-0000-4000-8000-000000000001",
      username: "alice",
      role: "editor",
    });
  });

  it("permission checkboxes are editable for participants and call setParticipantPermissions", () => {
    renderComponent();
    // viewer has scriptWrite = false -> toggle it on for alice
    const checkbox = screen.getAllByLabelText("edit alice")[0] as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(setParticipantPermissionsMutate).toHaveBeenCalledWith({
      uri: "10000000-0000-4000-8000-000000000001",
      username: "alice",
      permissions: { ...PLAY_ROLE_PERMISSIONS.viewer, scriptWrite: true },
    });
  });

  it("owner column checkboxes are disabled", () => {
    renderComponent();
    const ownerCheckbox = screen.getAllByLabelText("edit owner1")[0] as HTMLInputElement;
    expect(ownerCheckbox.checked).toBe(true);
    expect(ownerCheckbox.disabled).toBe(true);
  });

  it("hides editing when the user cannot manage (not owner, no settingsWrite)", () => {
    mockPlayContext = makePlayContext({ isOwner: false, settingsWrite: false });
    renderComponent();
    expect(screen.queryByLabelText("Role for alice")).toBeNull();
    const checkbox = screen.getAllByLabelText("edit alice")[0] as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it("shows 'custom' for participants with a non-standard role", () => {
    mockPlayContext = makePlayContext({
      participants: {
        owner1: { fullName: "Owner One", role: "owner", permissions: PLAY_ROLE_PERMISSIONS.owner },
        alice: {
          fullName: "Alice A",
          role: "custom:alice",
          permissions: { ...PLAY_ROLE_PERMISSIONS.viewer, scriptWrite: true },
        },
      },
    });
    renderComponent();
    const select = screen.getByLabelText("Role for alice") as HTMLSelectElement;
    expect(select.value).toBe("custom");
    expect(screen.getByText("custom")).toBeTruthy();
  });
});
