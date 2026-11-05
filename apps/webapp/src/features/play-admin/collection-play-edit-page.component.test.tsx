import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { CollectionPlayEditBreadcrumbs } from './collection-play-edit-page.component';

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    playsCollection: {
      getDetails: {
        queryOptions: (input: unknown) => ({
          queryKey: ['getDetails', input],
          queryFn: async () => ({ uri: 'u', title: 'Tartuffe', author: 'Molière' }),
        }),
      },
    },
  }),
}));

describe('CollectionPlayEditBreadcrumbs', () => {
  afterEach(() => cleanup());

  it('shows the script name in a book-icon tab after the collection crumb', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CollectionPlayEditBreadcrumbs uri="10000000-0000-4000-8000-000000000001" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Tartuffe')).toBeTruthy();
    expect(screen.getByText('Scripts collection')).toBeTruthy();
    // the title sits in the tab (book icon container), not a plain crumb
    const tab = screen.getByText('Tartuffe').closest('div');
    expect(tab?.className).toContain('tab');
    expect(tab?.querySelector('div[class*="icon"]')).toBeTruthy();
  });
});
