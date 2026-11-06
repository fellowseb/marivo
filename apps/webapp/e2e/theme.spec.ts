import { expect, test } from "@playwright/test";
import { deleteE2eUser, signIn } from "./clerk-auth";

/**
 * E2E scenario: sign in, open the account profile, switch theme (Forêt) and
 * mode (Dark) from the custom Clerk profile page, and check the theme sticks
 * after a reload (persisted per user on the server + cached locally).
 * A fresh Clerk user is created per run and deleted afterwards, whether the
 * test passes or fails.
 */
test("switch theme and mode from the profile, persisted after reload", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);
  const user = await signIn(page, request);
  try {
    await page.goto("/my-account");

    // open the custom "Theme" page in Clerk's UserProfile
    await page.getByText("Theme", { exact: true }).click();

    // default: Sable light
    await expect(page.locator("html")).toHaveAttribute("data-theme", "sable");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");

    // switch to Forêt, then to dark mode
    await page.getByRole("radio", { name: /Forêt/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "foret");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");

    await page.getByRole("radio", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "foret");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");

    // the preference survives a reload (local cache + server-side persistence)
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "foret");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
