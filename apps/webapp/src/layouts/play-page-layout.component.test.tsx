import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Result } from "@marivo/utils";
import PlayPageLayout from "./play-page-layout.component";
import { PlayContext, type PlayContextResult } from "../features/play-admin/play.context";
import { NotificationsContextProvider } from "../components/notifications.context";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, signOut: vi.fn() }),
  useUser: () => ({ user: { username: "tester" } }),
}));

const permissions = {
  scriptRead: true,
  scriptWrite: true,
  stagingNotesRead: true,
  blockingRead: true,
  blockingWrite: true,
  memorizeRead: true,
  planningRead: true,
  settingsRead: true,
  settingsWrite: true,
};

const okContext = Result.ok({
  details: { title: "My Play", uri: "u1" },
  permissions,
}) as unknown as PlayContextResult;

function renderLayout(contextValue: PlayContextResult, child = <div>page content</div>) {
  return render(
    <MemoryRouter initialEntries={["/plays/edit/u1/settings"]}>
      <NotificationsContextProvider>
        <PlayContext.Provider value={contextValue}>
          <Routes>
            <Route path="/plays/edit/:uri/*" element={<PlayPageLayout>{child}</PlayPageLayout>} />
          </Routes>
        </PlayContext.Provider>
      </NotificationsContextProvider>
    </MemoryRouter>,
  );
}

describe("PlayPageLayout", () => {
  afterEach(() => cleanup());

  it("keeps the header mounted while play details are loading", () => {
    renderLayout(null);
    expect(screen.getByRole("banner")).toBeTruthy();
    // the main area shows a loader instead of the page content
    expect(screen.queryByText("page content")).toBeNull();
  });

  it("keeps the header mounted while the page content suspends", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Suspender(): never {
      throw new Promise(() => {});
    }
    renderLayout(okContext, <Suspender />);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.queryByText("page content")).toBeNull();
  });

  it("renders children and the menu once the play is loaded", () => {
    renderLayout(okContext);
    expect(screen.getByText("page content")).toBeTruthy();
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("link", { name: /script/i })).toBeTruthy();
  });

  it("shows the not-found page in the main area on failure, header stays", () => {
    renderLayout(Result.failure(new Error("not found")) as unknown as PlayContextResult);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.queryByText("page content")).toBeNull();
  });
});
