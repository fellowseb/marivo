import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Container from "./container.component";

describe("Container", () => {
  afterEach(() => cleanup());

  it("renders children inside a bordered box", () => {
    const { container } = render(
      <Container>
        <p>content</p>
      </Container>,
    );
    const box = container.querySelector("div");
    expect(box).toBeTruthy();
    expect(box!.className).toContain("container");
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("merges a custom className with the container class", () => {
    const { container } = render(<Container className="my-box">x</Container>);
    const box = container.querySelector("div");
    expect(box!.className).toContain("container");
    expect(box!.className).toContain("my-box");
  });
});
