import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ScriptImportsPage from './script-imports-page.component';

const PROCESSING_ID = '10000000-0000-4000-8000-0000000000p1';
const REVIEWING_ID = '10000000-0000-4000-8000-0000000000r2';

let capturedQueryOpts: Record<string, unknown> | null = null;
const prefetchCalls: unknown[] = [];

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    plays: {
      allScriptImports: {
        queryOptions: () => {
          capturedQueryOpts = {
            queryKey: ['allScriptImports'],
            queryFn: async () => [
              { id: PROCESSING_ID, status: 'processing_files', error: null },
              { id: REVIEWING_ID, status: 'reviewing', error: null },
            ],
          };
          return capturedQueryOpts;
        },
      },
    },
    script: {
      latestChanges: {
        queryOptions: (input: unknown) => ({
          queryKey: ['latestChanges', input],
          queryFn: async () => ({ lastModifiedDate: new Date(0) }),
        }),
      },
    },
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const prefetchSpy = vi
    .spyOn(queryClient, 'prefetchQuery')
    .mockImplementation((opts: unknown) => {
      prefetchCalls.push(opts);
      return Promise.resolve();
    });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/plays/imports']}>
        <ScriptImportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, prefetchSpy };
}

describe('ScriptImportsPage resume gating', () => {
  beforeEach(() => {
    prefetchCalls.length = 0;
    capturedQueryOpts = null;
  });
  afterEach(() => cleanup());

  it('disables Resume with a waiting icon while processing, enables it when reviewing', async () => {
    renderPage();
    const resumeButtons = await screen.findAllByRole('button', { name: 'Resume' });
    expect(resumeButtons).toHaveLength(2);

    // processing import: disabled, not wrapped in a link (cannot navigate)
    const processingResume = resumeButtons[0] as HTMLButtonElement;
    expect(processingResume.disabled).toBe(true);
    expect(processingResume.closest('a')).toBeNull();

    // reviewing import: enabled and links to the resume URL
    const reviewingResume = resumeButtons[1] as HTMLButtonElement;
    expect(reviewingResume.disabled).toBe(false);
    expect(reviewingResume.closest('a')?.getAttribute('href')).toBe(
      `/plays/new/import?resume=${REVIEWING_ID}`,
    );
  });

  it('polls the imports list so the Resume gating updates on its own', async () => {
    renderPage();
    await screen.findAllByRole('button', { name: 'Resume' });
    expect(capturedQueryOpts?.refetchInterval).toBe(5000);
  });

  it('prefetches the script of reviewing imports into the cache', async () => {
    renderPage();
    await screen.findAllByRole('button', { name: 'Resume' });
    const keys = prefetchCalls.map(
      (opts) => (opts as { queryKey: unknown[] }).queryKey,
    );
    const reviewingPrefetch = keys.find(
      (key) => Array.isArray(key) && key[0] === 'latestChanges',
    ) as [string, { uri: string; from: string }] | undefined;
    expect(reviewingPrefetch).toBeTruthy();
    expect(reviewingPrefetch![1].uri).toBe(REVIEWING_ID);
    expect(reviewingPrefetch![1].from).toBe('import');
    // the processing import is not prefetched
    expect(
      keys.filter((key) => Array.isArray(key) && key[0] === 'latestChanges'),
    ).toHaveLength(1);
  });
});
