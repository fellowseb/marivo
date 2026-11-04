import { expect, test, type Page } from '@playwright/test';
import { deleteE2eUser, signIn } from './clerk-auth';

/** A script line, located by its text content. */
const lineWithText = (page: Page, text: string) =>
  page.locator('div[class*="replique"]', { hasText: text }).first();

const FIRST_PLAY = 'Tartuffe';

/**
 * E2E scenario: sign in, browse the plays collection (fixture data seeded by
 * apps/api/dev/fixtures.sql: 54 scripts by Marivaux, Molière, Shakespeare),
 * exercise pagination, server-side filtering and bookmarks, then pick a
 * script, review the preview, name the play and land on its edit page.
 * A fresh Clerk user is created per run and deleted afterwards, whether the
 * test passes or fails.
 */
test('browse, filter and paginate the collection, bookmark, then create a play from it', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const user = await signIn(page, request);
  try {
    await page.goto('/plays/new/from-collection');

    // 54 fixture scripts, 20 per page -> 3 pages
    await expect(page.getByText(FIRST_PLAY).first()).toBeVisible();
    await expect(page.getByText('Page 1 / 3 · 54 scripts')).toBeVisible();

    // pagination is server-driven
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 / 3 · 54 scripts')).toBeVisible();
    await page.getByRole('button', { name: 'Prev' }).click();
    await expect(page.getByText('Page 1 / 3 · 54 scripts')).toBeVisible();

    // server-side filter: author = Molière -> only Molière's plays listed
    await page.getByRole('button', { name: 'Author', exact: true }).click();
    await page.locator('input[type="text"]').nth(1).fill('Molière');
    await expect(page.getByText('Tartuffe')).toBeVisible();
    await expect(page.getByText('Pierre de Marivaux')).toHaveCount(0);
    await expect(page.getByText(/Page 1 \/ 1 · 18 scripts/)).toBeVisible();

    // bookmark a script, then filter by bookmarked only
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText(FIRST_PLAY).first()).toBeVisible();
    await page.getByText(FIRST_PLAY).first().click();
    await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
    await page.getByRole('button', { name: 'Bookmarked', exact: true }).first().click();
    await page.getByText('Only bookmarked').click();
    await expect(page.getByText(FIRST_PLAY).first()).toBeVisible();
    await expect(page.getByText('Le Misanthrope')).toHaveCount(0);
    await expect(page.getByText(/Page 1 \/ 1 · 1 scripts/)).toBeVisible();

    // clear filters, select the play and go through preview + name
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText(FIRST_PLAY).first()).toBeVisible();
    await page.getByText(FIRST_PLAY).first().click();
    await expect(page.getByText(/Un faux dévot/)).toBeVisible();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    await expect(next).toBeEnabled();
    await next.click();

    // Preview step (same as the import flow) shows the script lines
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(lineWithText(page, 'A line of the play.')).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();

    // Name step (same as the import flow), then create -> edit page
    await page.getByPlaceholder(/Othello/).fill('E2E Collection Play');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL(/\/plays\/edit\//, { timeout: 30_000 });
    await expect(lineWithText(page, 'A line of the play.')).toBeVisible();
  } finally {
    await deleteE2eUser(request, user.id);
  }
});
