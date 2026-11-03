import { expect, test, type Page, type Locator } from '@playwright/test';
import { deleteE2eUser, signIn } from './clerk-auth';

const insertZone = (page: Page) => page.locator('div[class*="lineToBeContainer"]').last();

/** A script line, located by its text content. */
const lineWithText = (page: Page, text: string): Locator =>
  page.locator('div[class*="replique"]', { hasText: text }).first();

const lineMenuHandle = (line: Locator): Locator => line.locator('[class*="menuHandle"]');

/**
 * E2E scenario: sign in, create a play from scratch, insert a heading and a
 * free-text line, edit the heading, and save twice so a previous version
 * exists. A fresh Clerk user is created per run and deleted afterwards,
 * whether the test passes or fails.
 */
test('login, create a play, add lines, edit and save them', async ({ page, request }) => {
  const user = await signIn(page, request);
  try {
    // Create a new empty play
    await page.goto('/plays/new/empty');
    await page.getByPlaceholder(/Othello/).fill('E2E Test Play');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForURL(/\/plays\/edit\//);

    // Insert a heading line: focus the insert zone, type "#" then level "1"
    await insertZone(page).click();
    await page.keyboard.press('#');
    await page.keyboard.press('1');
    await page.keyboard.type('Act I');
    const heading = lineWithText(page, 'Act I');
    await expect(heading).toBeVisible();

    // Save the new line (line menu -> "Save")
    await lineMenuHandle(heading).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Insert a free-text line at the end and type into it
    await insertZone(page).click();
    await page.keyboard.type('A stage direction.');
    await expect(lineWithText(page, 'stage direction')).toBeVisible();

    // Edit the heading text and save twice -> previous versions become available
    await heading.click();
    const editable = heading.locator('[contenteditable="plaintext-only"]');
    await expect(editable).toBeVisible();
    await page.keyboard.press('End');
    await page.keyboard.type(' - edited');
    await lineMenuHandle(heading).click();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await heading.click();
    await expect(editable).toBeVisible();
    await page.keyboard.press('End');
    await page.keyboard.type(' again');
    await lineMenuHandle(heading).click();
    await page.getByRole('button', { name: 'Save as new version' }).click();

    // Two saved versions of the heading now exist
    await lineMenuHandle(heading).click();
    await expect(page.getByRole('button', { name: 'Show previous versions' })).toBeVisible();
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
