import { expect, test, type Page } from '@playwright/test';
import { deleteE2eUser, signIn } from './clerk-auth';

/** A script line, located by its text content. */
const lineWithText = (page: Page, text: string) =>
  page.locator('div[class*="replique"]', { hasText: text }).first();

/**
 * E2E scenario: sign in, pick a script from the plays collection (fixture row
 * seeded by apps/api/dev/fixtures.sql), review the preview, name the play and
 * land on its edit page. A fresh Clerk user is created per run and deleted
 * afterwards, whether the test passes or fails.
 */
test('pick a script from the collection, preview it and create a play', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const user = await signIn(page, request);
  try {
    await page.goto('/plays/new/from-collection');

    // The fixture collection entry is listed under its (sticky) author header
    await expect(page.getByText('Fixture Author')).toBeVisible();
    const item = page.getByText('The Fixture Play');
    await expect(item).toBeVisible();
    await expect(page.getByText(/8 words/)).toBeVisible();

    // Next stays disabled until a script is selected
    const next = page.getByRole('button', { name: 'Next', exact: true });
    await expect(next).toBeDisabled();
    await item.click();

    // The details panel shows synopsis and character names
    await expect(page.getByText(/A small synopsis for the fixture play/)).toBeVisible();
    await expect(page.getByText('ALICE')).toBeVisible();
    await expect(next).toBeEnabled();
    await next.click();

    // Preview step (same as the import flow) shows the script lines
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(lineWithText(page, 'Hello from the collection fixture.')).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    // Name step (same as the import flow), then create -> edit page
    await page.getByPlaceholder(/Othello/).fill('E2E Collection Play');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/plays\/edit\//, { timeout: 30_000 });
    await expect(lineWithText(page, 'Hello from the collection fixture.')).toBeVisible();
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
