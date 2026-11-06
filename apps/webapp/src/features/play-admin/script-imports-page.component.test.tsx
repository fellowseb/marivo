import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import ScriptImportsPage from './script-imports-page.component';

const PROCESSING_ID = '10000000-0000-4000-8000-0000000000p1';
const REVIEWING_ID = '10000000-0000-4000-8000-0000000000r2';

let capturedQueryOpts: Record<string, unknown> | null = null;
let prefetchCalls: { uri: string; from: string }[] = [];
let prefetchGate: Promise<void> | null = null;

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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(queryClient, 'prefetchQuery').mockImplementation((opts: unknown) => {
    const input = (opts as { queryKey: [string, { uri: string; from: string }] }).queryKey[1];
    prefetchCalls.push({ uri: input.uri, from: input.from });
    return prefetchGate ?? Promise.resolve();
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/plays/imports']}>
        <ScriptImportsPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScriptImportsPage resume flow', () => {
  beforeEach(() => {
    prefetchCalls = [];
    prefetchGate = null;
    capturedQueryOpts = null;
  });
  afterEach(() => cleanup());

  it('disables Resume with a waiting icon while processing, enables it when reviewing', async () => {
    renderPage();
    const resumeButtons = await screen.findAllByRole('button', { name: 'Resume' });
    expect(resumeButtons).toHaveLength(2);

    const processingResume = resumeButtons[0] as HTMLButtonElement;
    expect(processingResume.disabled).toBe(true);

    const reviewingResume = resumeButtons[1] as HTMLButtonElement;
    expect(reviewingResume.disabled).toBe(false);
  });

  it('polls the imports list so the Resume gating updates on its own', async () => {
    renderPage();
    await screen.findAllByRole('button', { name: 'Resume' });
    expect(capturedQueryOpts?.refetchInterval).toBe(5000);
  });

  it('does not prefetch scripts on page load', async () => {
    renderPage();
    await screen.findAllByRole('button', { name: 'Resume' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(prefetchCalls).toHaveLength(0);
  });

  it('on Resume click: disables the button, prefetches the script, then navigates', async () => {
    let releasePrefetch!: () => void;
    prefetchGate = new Promise<void>((resolve) => {
      releasePrefetch = resolve;
    });
    renderPage();
    const resumeButtons = await screen.findAllByRole('button', { name: 'Resume' });
    const reviewingResume = resumeButtons[1] as HTMLButtonElement;

    fireEvent.click(reviewingResume);

    // mid-prefetch: disabled + waiting, prefetched only the clicked import
    expect(reviewingResume.disabled).toBe(true);
    expect(prefetchCalls).toEqual([{ uri: REVIEWING_ID, from: 'import' }]);
    expect(screen.getByTestId('location').textContent).toBe('/plays/imports');

    // prefetch done -> navigate to the resume flow
    releasePrefetch();
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe(
        `/plays/new/import?resume=${REVIEWING_ID}`,
      ),
    );
  });
});
