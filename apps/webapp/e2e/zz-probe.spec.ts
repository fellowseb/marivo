import { expect, test } from "@playwright/test";
import path from "node:path";
import { deleteE2eUser, signIn } from "./clerk-auth";

const assetFiles = ["fake-script-part1.txt", "fake-script-part2.txt", "fake-script-part3.txt"].map(
  (f) => path.join(import.meta.dirname, "assets", f),
);

test("line context menu exclude/include in preview", async ({ page, request }) => {
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
    // close the default-open selection panel so it doesn't cover the right-side handle
    await page.locator('[class*="_panel_"] button').first().click();
    // right-side menu handle opens the context menu
    const menuHandle = page.locator('[class*="menuHandle"]').first();
    await menuHandle.click();
    await expect(page.getByRole("button", { name: /Exclude from import/ })).toBeVisible();
    await page.getByRole("button", { name: /Exclude from import/ }).click();
    // line turns red (excluded) even with the panel closed
    await expect(page.locator('[class*="excluded"]').first()).toBeVisible();
    // reopen the menu on the excluded line -> now offers Include
    await page.locator('[class*="menuHandle"]').first().click();
    await expect(page.getByRole("button", { name: /Include into import/ })).toBeVisible();
    await page.getByRole("button", { name: /Include into import/ }).click();
    await expect(page.locator('[class*="excluded"]')).toHaveCount(0);
    console.log("PROBE OK: context menu exclude/include round-trip");
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
