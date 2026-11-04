import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import FromCollection from './from-collection.component';

const scripts = [
  {
    uri: '99999999-9999-4999-8999-999999999999',
    title: 'The Fixture Play',
    author: 'Fixture Author',
    lang: 'en',
    genre: 'comedy',
    period: 'contemporary',
    synopsis: 'A small synopsis.',
    numberOfRoles: 2,
    numberOfMaleRoles: 1,
    numberOfFemaleRoles: 1,
    numberOfWords: 6,
    characters: { '11111111-1111-4111-8111-111111111111': 'ALICE' },
  },
  {
    uri: '88888888-8888-4888-8888-888888888888',
    title: 'Another Play',
    author: 'Other Author',
    lang: 'fr',
    genre: 'drama',
    period: 'modernism',
    synopsis: null,
    numberOfRoles: 3,
    numberOfMaleRoles: 2,
    numberOfFemaleRoles: 1,
    numberOfWords: 120,
    characters: {},
  },
];

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    playsCollection: {
      listAll: {
        queryOptions: () => ({
          queryKey: ['playsCollection.listAll'],
          queryFn: async () => ({ scripts }),
        }),
      },
    },
    plays: {
      createFromCollection: { mutationOptions: () => ({ mutationKey: ['createFromCollection'] }) },
    },
  }),
}));

vi.mock('./collection-metadata.context', () => ({
  useCollectionMetadataContext: () => ({
    genres: ['comedy', 'drama'],
    periods: ['contemporary', 'modernism'],
    count: 2,
  }),
}));

function renderPick() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FromCollection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FromCollection pick step', () => {
  afterEach(() => cleanup());

  it('groups scripts under their author and shows item metadata', async () => {
    renderPick();

    expect(await screen.findByText('The Fixture Play')).toBeTruthy();
    expect(screen.getByText('Another Play')).toBeTruthy();
    // one sticky header per author
    expect(screen.getByText('Fixture Author')).toBeTruthy();
    expect(screen.getByText('Other Author')).toBeTruthy();
    // item metadata line: lang, genre, period, roles, word count
    expect(screen.getByText(/EN · comedy · contemporary · 2 roles · 6 words/)).toBeTruthy();
  });

  it('keeps Next disabled until a script is selected, then shows details', async () => {
    renderPick();

    const next = (await screen.findByRole('button', { name: 'Next' })) as HTMLButtonElement;
    expect(next.disabled).toBe(true);

    fireEvent.click(await screen.findByText('The Fixture Play'));

    // details panel: synopsis + character names
    expect(screen.getByText('A small synopsis.')).toBeTruthy();
    expect(screen.getByText('ALICE')).toBeTruthy();
    expect(next.disabled).toBe(false);
  });
});
