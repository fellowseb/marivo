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
    // worker job (redis queue -> worker -> garage -> mock LLM). The Import
    // button stays disabled while init/uploads/processing are pending.
    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await importButton.click();
    await expect(importButton).toBeDisabled();

    // The import page polls the status (processing feedback may be too fast
    // to catch with the mock) and auto-advances to the preview step once the
    // worker has stored a reviewable result.
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible({
      timeout: 120_000,
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
