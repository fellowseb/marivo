import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { OngoingImportsSection } from "./ongoing-imports-section.component";

const PROCESSING_ID = "10000000-0000-4000-8000-0000000000p1";
const REVIEWING_ID = "10000000-0000-4000-8000-0000000000r2";

let capturedQueryOpts: Record<string, unknown> | null = null;
let prefetchCalls: { uri: string; from: string }[] = [];
let prefetchGate: Promise<void> | null = null;
const deleteMock = vi.fn().mockResolvedValue({});
let invalidateCalls: unknown[] = [];
let listValue: unknown[] = [
  {
    id: PROCESSING_ID,
    createdAt: new Date("2026-11-06T10:00:00Z"),
    status: "processing_files",
    error: null,
  },
  {
    id: REVIEWING_ID,
    createdAt: new Date("2026-11-06T11:00:00Z"),
    status: "reviewing",
    error: null,
  },
];

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    plays: {
      allScriptImports: {
        queryOptions: () => {
          capturedQueryOpts = {
            queryKey: ["allScriptImports"],
            queryFn: async () => listValue,
          };
          return capturedQueryOpts;
        },
        queryKey: () => ["allScriptImports"],
      },
      deleteScriptImport: {
        mutationOptions: (opts?: { onSuccess?: () => void }) => ({
          mutationKey: ["deleteScriptImport"],
          mutationFn: async (input: { importId: string }) => {
            deleteMock(input);
            opts?.onSuccess?.();
            return {};
          },
        }),
      },
    },
    script: {
      latestChanges: {
        queryOptions: (input: unknown) => ({
          queryKey: ["latestChanges", input],
          queryFn: async () => ({ lastModifiedDate: new Date(0) }),
        }),
      },
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(queryClient, "prefetchQuery").mockImplementation((opts: unknown) => {
    const input = (opts as { queryKey: [string, { uri: string; from: string }] }).queryKey[1];
    prefetchCalls.push({ uri: input.uri, from: input.from });
    return prefetchGate ?? Promise.resolve();
  });
  vi.spyOn(queryClient, "invalidateQueries").mockImplementation((args: unknown) => {
    invalidateCalls.push(args);
    return Promise.resolve();
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/plays/new/import"]}>
        <OngoingImportsSection />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OngoingImportsSection", () => {
  beforeEach(() => {
    prefetchCalls = [];
    prefetchGate = null;
    invalidateCalls = [];
    capturedQueryOpts = null;
    deleteMock.mockClear();
    listValue = [
      {
        id: PROCESSING_ID,
        createdAt: new Date("2026-11-06T10:00:00Z"),
        status: "processing_files",
        error: null,
      },
      {
        id: REVIEWING_ID,
        createdAt: new Date("2026-11-06T11:00:00Z"),
        status: "reviewing",
        error: null,
      },
    ];
  });
  afterEach(() => cleanup());

  it("renders ongoing imports with their start date and status, and polls every 5s", async () => {
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Ongoing imports \(2\)/ }));
    expect(await screen.findByText("Processing files")).toBeTruthy();
    expect(screen.getByText("Reviewing")).toBeTruthy();
    expect(screen.getByText(new Date("2026-11-06T10:00:00Z").toLocaleString())).toBeTruthy();
    expect(capturedQueryOpts?.refetchInterval).toBe(5000);
  });

  it("renders nothing when there are no ongoing imports", async () => {
    listValue = [];
    renderSection();
    await waitFor(() => expect(capturedQueryOpts).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Ongoing imports/ })).toBeNull();
  });

  it("disables Resume with a waiting icon while processing, enables it when reviewing", async () => {
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Ongoing imports \(2\)/ }));
    const resumeButtons = await screen.findAllByRole("button", { name: "Resume" });
    expect(resumeButtons).toHaveLength(2);
    expect((resumeButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((resumeButtons[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it("on Resume click: disables the button, prefetches the script, then navigates", async () => {
    let releasePrefetch!: () => void;
    prefetchGate = new Promise<void>((resolve) => {
      releasePrefetch = resolve;
    });
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Ongoing imports \(2\)/ }));
    const resumeButtons = await screen.findAllByRole("button", { name: "Resume" });
    const reviewingResume = resumeButtons[1] as HTMLButtonElement;

    fireEvent.click(reviewingResume);

    expect(reviewingResume.disabled).toBe(true);
    expect(prefetchCalls).toEqual([{ uri: REVIEWING_ID, from: "import" }]);
    expect(screen.getByTestId("location").textContent).toBe("/plays/new/import");

    releasePrefetch();
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe(
        `/plays/new/import?resume=${REVIEWING_ID}`,
      ),
    );
  });

  it("on Delete: calls deleteScriptImport and invalidates the list", async () => {
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /Ongoing imports \(2\)/ }));
    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith({ importId: PROCESSING_ID }));
    await waitFor(() => expect(invalidateCalls.length).toBeGreaterThan(0));
  });
});
