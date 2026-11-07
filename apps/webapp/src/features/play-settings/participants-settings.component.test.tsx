import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Result } from "@marivo/utils";
import ParticipantsSettings from "./participants-settings.component";

const setParticipantRoleMutate = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...mod,
    useMutation: () => ({ mutate: setParticipantRoleMutate, isPending: false }),
  };
});

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    plays: {
      setParticipantRole: {
        mutationOptions: () => ({ mutationKey: ["setParticipantRole"] }),
      },
      playDetails: {
        queryKey: () => ["plays", "playDetails"],
      },
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
  participants?: Record<string, { fullName: string; role: string | null }>;
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
      scriptRead: true,
      scriptWriteSharedDrafts: false,
      scriptWrite: false,
      stagingNotesRead: false,
      stagingNotesWrite: false,
      blockingRead: false,
      blockingWrite: false,
      memorizeRead: false,
      planningRead: false,
      planningWrite: false,
      settingsRead: true,
      settingsWrite: overrides?.settingsWrite ?? true,
    },
    participants: overrides?.participants ?? {
      owner1: { fullName: "Owner One", role: "owner" },
      alice: { fullName: "Alice A", role: "viewer" },
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
    mockPlayContext = makePlayContext();
  });
  afterEach(() => cleanup());

  it("lists participants with their roles; the owner role is not editable", () => {
    renderComponent();
    expect(screen.getByText(/Owner One/)).toBeTruthy();
    expect(screen.getByText(/Alice A/)).toBeTruthy();
    expect(screen.getAllByText("owner").length).toBeGreaterThan(0);
    // owner row: plain text, not a select
    expect(screen.queryByLabelText("Role for owner1")).toBeNull();
    // participant row: a select with the current role
    const select = screen.getByLabelText("Role for alice") as HTMLSelectElement;
    expect(select.value).toBe("viewer");
  });

  it("assigning a role calls setParticipantRole with uri, username and role", () => {
    renderComponent();
    const select = screen.getByLabelText("Role for alice");
    fireEvent.change(select, { target: { value: "editor" } });
    expect(setParticipantRoleMutate).toHaveBeenCalledWith({
      uri: "10000000-0000-4000-8000-000000000001",
      username: "alice",
      role: "editor",
    });
  });

  it("hides the role select when the user cannot manage (not owner, no settingsWrite)", () => {
    mockPlayContext = makePlayContext({ isOwner: false, settingsWrite: false });
    renderComponent();
    expect(screen.queryByLabelText("Role for alice")).toBeNull();
    expect(screen.getAllByText("viewer").length).toBeGreaterThan(0);
  });

  it("renders the read-only permission matrix for all roles", () => {
    renderComponent();
    for (const role of ["owner", "admin", "editor", "viewer", "guest"]) {
      expect(screen.getAllByText(role).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Script").length).toBeGreaterThan(0);
  });
});
