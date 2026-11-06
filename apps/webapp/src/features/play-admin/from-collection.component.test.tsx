import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import FromCollection from "./from-collection.component";

const scripts = [
  {
    uri: "10000000-0000-4000-8000-000000000001",
    title: "Le Jeu de l'amour et du hasard",
    author: "Pierre de Marivaux",
    lang: "fr",
    genre: "comedy",
    period: "xviiith",
    synopsis: "Un valet et sa maîtresse échangent leurs rôles.",
    numberOfRoles: 4,
    numberOfMaleRoles: 2,
    numberOfFemaleRoles: 2,
    numberOfWords: 11,
    characters: { "11111111-1111-4111-8111-111111111111": "HERO" },
    bookmarked: false,
    archived: false,
  },
  {
    uri: "10000000-0000-4000-8000-000000000002",
    title: "Hamlet",
    author: "William Shakespeare",
    lang: "en",
    genre: "tragedy",
    period: "elizabethan",
    synopsis: null,
    numberOfRoles: 8,
    numberOfMaleRoles: 6,
    numberOfFemaleRoles: 2,
    numberOfWords: 42,
    characters: {},
    bookmarked: true,
    archived: false,
  },
];

const listAllCalls: unknown[] = [];

vi.mock("../../trpc", () => ({
  useTRPC: () => ({
    playsCollection: {
      listAll: {
        queryOptions: (input: unknown) => {
          listAllCalls.push(input);
          return {
            queryKey: ["playsCollection.listAll", input],
            queryFn: async () => ({ scripts, total: 54, page: 1, pageSize: 20 }),
          };
        },
        queryKey: () => ["playsCollection.listAll"],
      },
      toggleBookmark: { mutationOptions: () => ({ mutationKey: ["toggleBookmark"] }) },
    },
    plays: {
      createFromCollection: { mutationOptions: () => ({ mutationKey: ["createFromCollection"] }) },
    },
  }),
}));

vi.mock("./collection-metadata.context", () => ({
  useCollectionMetadataContext: () => ({
    genres: ["comedy", "tragedy"],
    periods: ["xviiith", "elizabethan"],
    count: 2,
  }),
}));

// no Clerk role by default: the "Edit in collection" button stays hidden;
// tests can set mockMetadata.role (e.g. "collection-maintainer")
const { mockMetadata } = vi.hoisted(() => ({
  mockMetadata: { role: undefined as unknown },
}));
vi.mock("@clerk/react", () => ({
  useUser: () => ({ user: { publicMetadata: mockMetadata } }),
}));

function renderPick() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FromCollection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FromCollection pick step", () => {
  beforeEach(() => {
    localStorage.clear();
    listAllCalls.length = 0;
    mockMetadata.role = undefined;
  });
  afterEach(() => cleanup());

  it("groups scripts under their author and shows item metadata + pagination", async () => {
    renderPick();

    expect(await screen.findByText("Le Jeu de l'amour et du hasard")).toBeTruthy();
    expect(screen.getByText("Hamlet")).toBeTruthy();
    expect(screen.getByText("Pierre de Marivaux")).toBeTruthy();
    expect(screen.getByText("William Shakespeare")).toBeTruthy();
    expect(screen.getByText("FR · comedy · xviiith · 2 male + 2 female")).toBeTruthy();
    expect(screen.getByText(/Page 1 \/ 3 · 54 scripts/)).toBeTruthy();
    // only the bookmarked item (Hamlet) shows the heart icon on the right
    expect(screen.getAllByRole("img", { name: "Bookmarked" })).toHaveLength(1);
  });

  it("keeps Next disabled until a script is selected, then shows details; close unselects", async () => {
    renderPick();

    const next = (await screen.findByRole("button", {
      name: "Next",
      exact: true,
    })) as HTMLButtonElement;
    expect(next.disabled).toBe(true);

    fireEvent.click(await screen.findByText("Le Jeu de l'amour et du hasard"));

    expect(screen.getByText(/Un valet et sa maîtresse échangent leurs rôles/)).toBeTruthy();
    expect(screen.getByText("HERO")).toBeTruthy();
    expect(next.disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(/Un valet et sa maîtresse/)).toBeNull();
    expect(next.disabled).toBe(true);
  });

  it('hides the "Edit in collection" button for users without the edit_collection_play_script capability', async () => {
    renderPick();
    fireEvent.click(await screen.findByText("Le Jeu de l'amour et du hasard"));
    expect(await screen.findByText(/Un valet et sa maîtresse/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit in collection" })).toBeNull();
  });

  it("hides the Archived filter for users without the edit_collection_play_metadata capability", async () => {
    renderPick();
    await screen.findByText("Hamlet");
    expect(screen.queryByRole("button", { name: "Archived" })).toBeNull();
    expect(screen.queryByText("Only archived")).toBeNull();
  });

  it("shows the Archived filter for collection maintainers and counts its toggle as a set control", async () => {
    mockMetadata.role = "collection-maintainer";
    renderPick();
    await screen.findByText("Hamlet");
    const archivedHeader = screen.getByRole("button", { name: "Archived" });
    fireEvent.click(archivedHeader);
    fireEvent.click(screen.getByRole("checkbox", { name: "Only archived" }));
    expect(screen.getByRole("button", { name: "Filter by (1)" })).toBeTruthy();
    const lastCall = listAllCalls.at(-1) as { filters: { archivedOnly?: boolean } };
    expect(lastCall.filters.archivedOnly).toBe(true);
    // value set: section forced open and not collapsible
    const header = screen.getByRole("button", { name: "Archived" }) as HTMLButtonElement;
    expect(header.disabled).toBe(true);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("sends filters to the server and persists them in localStorage; Clear resets values and collapses sections", async () => {
    renderPick();
    await screen.findByText("Le Jeu de l'amour et du hasard");
    // the Title section is collapsed by default
    let titleHeader = screen.getByRole("button", { name: "Title" }) as HTMLButtonElement;
    expect(titleHeader.getAttribute("aria-expanded")).toBe("false");
    // expanding the section shows its body
    fireEvent.click(titleHeader);
    expect(titleHeader.getAttribute("aria-expanded")).toBe("true");
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hamlet" } });

    // the query received the title filter
    await screen.findByText(/Page 1 \/ 3/);
    const lastCall = listAllCalls.at(-1) as { filters: { title?: string } };
    expect(lastCall.filters.title).toBe("hamlet");
    // persisted
    expect(JSON.parse(localStorage.getItem("marivo:collection-filters")!)).toMatchObject({
      title: "hamlet",
    });

    // a section with a value set cannot be collapsed anymore
    titleHeader = screen.getByRole("button", { name: "Title" }) as HTMLButtonElement;
    expect(titleHeader.disabled).toBe(true);
    fireEvent.click(titleHeader);
    expect(titleHeader.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(input.value).toBe("");
    expect(JSON.parse(localStorage.getItem("marivo:collection-filters")!)).toMatchObject({
      title: "",
      openSections: {},
    });
    // back to collapsed and collapsible
    titleHeader = screen.getByRole("button", { name: "Title" }) as HTMLButtonElement;
    expect(titleHeader.disabled).toBe(false);
    expect(titleHeader.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the set-control count on the toggle and Clear only when > 0", async () => {
    renderPick();
    await screen.findByText("Hamlet");

    // nothing set: Clear hidden, toggle has no count
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(screen.getByRole("button", { name: "Filter by" })).toBeTruthy();

    // set the title text control
    fireEvent.click(screen.getByRole("button", { name: "Title" }));
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hamlet" } });
    expect(screen.getByRole("button", { name: "Filter by (1)" })).toBeTruthy();

    // set the bookmarked toggle
    fireEvent.click(screen.getByRole("button", { name: "Bookmarked" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Only bookmarked" }));
    expect(screen.getByRole("button", { name: "Filter by (2)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();

    // Clear resets -> count back to 0, Clear disappears
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(screen.getByRole("button", { name: "Filter by" })).toBeTruthy();
  });

  it("text controls have a clear button that resets only that control", async () => {
    renderPick();
    await screen.findByText("Hamlet");
    fireEvent.click(screen.getByRole("button", { name: "Title" }));
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(screen.queryByRole("button", { name: "Clear title filter" })).toBeNull();

    fireEvent.change(input, { target: { value: "hamlet" } });
    expect(screen.getByRole("button", { name: "Filter by (1)" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear title filter" }));
    expect(input.value).toBe("");
    expect(screen.queryByRole("button", { name: "Clear title filter" })).toBeNull();
    expect(screen.getByRole("button", { name: "Filter by" })).toBeTruthy();
    const lastCall = listAllCalls.at(-1) as { filters: { title?: string } };
    expect(lastCall.filters.title).toBeUndefined();
  });

  it("persists the open/collapsed state of filter sections in localStorage", async () => {
    renderPick();
    await screen.findByText("Hamlet");
    fireEvent.click(screen.getByRole("button", { name: "Author" }));
    const stored = JSON.parse(localStorage.getItem("marivo:collection-filters")!);
    expect(stored.openSections).toEqual({ author: true });
  });

  it("restores filters from localStorage on mount; values apply even when their section is collapsed", async () => {
    localStorage.setItem(
      "marivo:collection-filters",
      JSON.stringify({
        title: "hamlet",
        author: "",
        languages: [],
        roles: [],
        maleRoles: [],
        femaleRoles: [],
        genres: ["tragedy"],
        periods: [],
        bookmarkedOnly: false,
        archivedOnly: false,
        openSections: {},
      }),
    );
    renderPick();
    await screen.findByText("Hamlet");
    const lastCall = listAllCalls.at(-1) as { filters: { title?: string; genres?: string[] } };
    expect(lastCall.filters.title).toBe("hamlet");
    expect(lastCall.filters.genres).toEqual(["tragedy"]);
    // sections with a value are force-open and not collapsible
    const titleHeader = screen.getByRole("button", { name: "Title" }) as HTMLButtonElement;
    expect(titleHeader.getAttribute("aria-expanded")).toBe("true");
    expect(titleHeader.disabled).toBe(true);
    // sections without a value stay collapsed
    expect(screen.getByRole("button", { name: "Author" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });
});
