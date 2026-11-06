import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const hexColorRegex = /#[0-9a-fA-F]{3,8}\b/;

function listCssFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dir, entry.name);
      return entry.isDirectory()
        ? listCssFiles(entryPath)
        : entry.name.endsWith(".css")
          ? [entryPath]
          : [];
    })
    .sort();
}

const cssFiles = listCssFiles(srcDir);
const indexCss = cssFiles.find((file) => file.endsWith("src/index.css"));
const moduleCssFiles = cssFiles.filter((file) => file !== indexCss);

describe("design tokens", () => {
  it("defines the token layer in index.css", () => {
    expect(indexCss).toBeDefined();
    const indexCssContent = fs.readFileSync(indexCss!, "utf8");
    for (const token of [
      "--color-accent",
      "--color-bg",
      "--color-surface",
      "--color-danger",
      "--font-size-base",
      "--radius-sm",
      "--shadow-md",
    ]) {
      expect(indexCssContent).toContain(`${token}:`);
    }
  });

  it("has no hardcoded hex colors outside of index.css", () => {
    const offenders = moduleCssFiles.flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line, index) => ({ file, line, index }))
        .filter(({ line }) => hexColorRegex.test(line))
        .map(({ file, line, index }) => `${file}:${index + 1}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });

  it("only uses color tokens that are defined in index.css", () => {
    const definedTokens = new Set(
      fs
        .readFileSync(indexCss!, "utf8")
        .split("\n")
        .flatMap((line) => line.trim().match(/^--[a-z0-9-]+(?=:)/) ?? []),
    );
    const usedTokens = moduleCssFiles.flatMap((file) =>
      [...fs.readFileSync(file, "utf8").matchAll(/var\((--[a-z0-9-]+)\)/g)].map((match) => ({
        file,
        token: match[1],
      })),
    );
    const localTokens = new Set(
      moduleCssFiles.flatMap((file) =>
        [...fs.readFileSync(file, "utf8").matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(
          (match) => match[1],
        ),
      ),
    );
    const undefinedTokens = usedTokens
      .filter(
        ({ token }) =>
          !definedTokens.has(token) &&
          !localTokens.has(token) &&
          !token.startsWith("--toggle-") &&
          !token.startsWith("--button-"),
      )
      .map(({ file, token }) => `${file}: ${token}`);
    expect(undefinedTokens).toEqual([]);
  });
});
