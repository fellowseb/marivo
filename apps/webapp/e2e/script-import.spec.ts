import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { deleteE2eUser, signIn } from './clerk-auth';

const assetFiles = ['fake-script-part1.txt', 'fake-script-part2.txt', 'fake-script-part3.txt'].map(
  (f) => path.join(import.meta.dirname, 'assets', f),
);

/** A script line, located by its text content. */
const lineWithText = (page: Page, text: string) =>
  page.locator('div[class*="replique"]', { hasText: text }).first();

/**
 * E2E scenario: sign in, import a script from 3 fake text files (the worker's
 * Mistral call is stubbed by the mistral-mock compose service), review the
 * imported lines, create the play and land on the script edit page.
 * A fresh Clerk user is created per run and deleted afterwards, whether the
 * test passes or fails.
 *
 * Requires the E2E compose stack with the mock:
 *   docker compose -f compose.yaml -f compose.e2e.yaml up -d --build
 */
test('import a script from 3 files (stubbed LLM), review it and open the play', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  const user = await signIn(page, request);
  try {
    await page.goto('/plays/new/import');

    // Select the 3 fake script files on the (hidden) file input
    await page.setInputFiles('input[type="file"]', assetFiles);
    await expect(page.getByText('Selected script files: 3')).toBeVisible();

    // Start the import: init + file uploads; the last upload publishes the
    // worker job (redis queue -> worker -> garage -> mock LLM). The button
    // stays disabled while init/uploads are pending, so wait for it to
    // re-enable before leaving the page (leaving early can cancel the uploads).
    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await importButton.click();
    await expect(importButton).toBeEnabled({ timeout: 120_000 });

    // The imports page lists ongoing imports and shows "Resume" once the
    // worker has stored a reviewable result. The page does not auto-poll,
    // so click Refresh until the button appears.
    await page.goto('/plays/imports');
    const resume = page.getByRole('button', { name: 'Resume' }).first();
    const refresh = page.getByRole('button', { name: 'Refresh' });
    let resumed = false;
    for (let attempt = 0; attempt < 40 && !resumed; attempt++) {
      resumed = await resume.isVisible().catch(() => false);
      if (!resumed) {
        await refresh.click();
        await page.waitForTimeout(3_000);
      }
    }
    expect(resumed, 'import never reached the reviewing state').toBe(true);
    await resume.click();
    await page.waitForURL(/\/plays\/new\/import\?resume=/);

    // Preview step: the parsed (mocked) lines are displayed
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(lineWithText(page, 'Hello from the mock.')).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    // Name the project and create it -> navigates to the script edit page
    await page.getByPlaceholder(/Othello/).fill('E2E Import Play');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/plays\/edit\//, { timeout: 60_000 });
    await expect(lineWithText(page, 'Hello from the mock.')).toBeVisible();
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
