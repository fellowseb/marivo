import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { MenuBar, type MenuBarDefinition } from "./menubar.component";
import { PlayContext } from "../features/play-admin/play.context";

const definition: MenuBarDefinition = {
  items: [
    { label: "Script", icon: "script", path: "/script" },
    { label: "Settings", icon: "settings", path: "/settings" },
    { label: "Admin", icon: "user", path: "/admin", accessPermission: "settingsWrite" },
  ],
};

function renderMenuBar(initialPath = "/script") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<MenuBar definition={definition} />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** give each rendered link fake layout dimensions (jsdom reports 0) */
function mockLinkDimensions() {
  const dims = new Map<HTMLElement, { left: number; width: number }>();
  const leftSpy = vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return dims.get(this)?.left ?? 0;
  });
  const widthSpy = vi
    .spyOn(HTMLElement.prototype, "offsetWidth", "get")
    .mockImplementation(function (this: HTMLElement) {
      return dims.get(this)?.width ?? 0;
    });
  return {
    set(link: HTMLElement, left: number, width: number) {
      dims.set(link, { left, width });
    },
    restore() {
      leftSpy.mockRestore();
      widthSpy.mockRestore();
    },
  };
}

function getHighlight(container: HTMLElement): HTMLElement {
  const highlight = container.querySelector<HTMLElement>('span[class*="highlight"]');
  expect(highlight).toBeTruthy();
  return highlight!;
}

describe("MenuBar", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders one link per item and marks the active one", () => {
    renderMenuBar("/script");
    const scriptLink = screen.getByRole("link", { name: /script/i });
    expect(scriptLink.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /settings/i })).toBeTruthy();
  });

  it("positions the highlight under the active tab and slides it on click", () => {
    const dims = mockLinkDimensions();
    const { container } = renderMenuBar("/script");
    const scriptLink = screen.getByRole("link", { name: /script/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    dims.set(scriptLink, 0, 100);
    dims.set(settingsLink, 102, 90);

    // re-render so the layout effect re-measures with the mocked dimensions
    fireEvent.click(settingsLink);

    const highlight = getHighlight(container);
    expect(settingsLink.getAttribute("aria-current")).toBe("page");
    expect(highlight.style.transform).toBe("translateX(102px)");
    expect(highlight.style.width).toBe("90px");
    expect(highlight.style.opacity).toBe("1");
    dims.restore();
  });

  it("hides items whose access permission is not granted", () => {
    const playContextValue = {
      isOk: () => true,
      dataOrThrow: () => ({ permissions: { scriptRead: true } }),
    };
    render(
      <MemoryRouter initialEntries={["/script"]}>
        <PlayContext.Provider value={playContextValue as never}>
          <Routes>
            <Route path="*" element={<MenuBar definition={definition} />} />
          </Routes>
        </PlayContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
    expect(screen.getByRole("link", { name: /script/i })).toBeTruthy();
  });
});
