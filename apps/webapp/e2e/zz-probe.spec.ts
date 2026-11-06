import { expect, test } from "@playwright/test";
import path from "node:path";
import { deleteE2eUser, signIn } from "./clerk-auth";

const assetFiles = ["fake-script-part1.txt", "fake-script-part2.txt", "fake-script-part3.txt"].map(
  (f) => path.join(import.meta.dirname, "assets", f),
);

test("line selection works in preview", async ({ page, request }) => {
  test.setTimeout(300_000);
  const user = await signIn(page, request);
  try {
    await page.goto("/plays/new/import");
    await page.setInputFiles('input[type="file"]', assetFiles);
    await expect(page.getByText("Selected script files: 3")).toBeVisible();
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible({
      timeout: 120_000,
    });
    // panel open by default
    await expect(
      page.locator('[class*="headerTitleIcon"]', { hasText: "Import selection" }),
    ).toBeVisible();
    // click a line handle -> line becomes selected -> Exclude button appears
    await page.locator('[class*="repliqueHandle"]').first().click();
    await expect(page.locator('[class*="selected"]').first()).toBeVisible();
    await page.getByRole("button", { name: /Exclude from import/ }).click();
    await expect(page.getByText(/Excluded \(1\)/)).toBeVisible();
    await expect(page.locator('[class*="excluded"]').first()).toBeVisible();
    console.log("PROBE OK: select line in preview, exclude, red highlight");
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
