import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import FromCollection from './from-collection.component';

const scripts = [
  {
    uri: '10000000-0000-4000-8000-000000000001',
    title: 'Le Jeu de l\'amour et du hasard',
    author: 'Pierre de Marivaux',
    lang: 'fr',
    genre: 'comedy',
    period: 'xviiith',
    synopsis: 'Un valet et sa maîtresse échangent leurs rôles.',
    numberOfRoles: 4,
    numberOfMaleRoles: 2,
    numberOfFemaleRoles: 2,
    numberOfWords: 11,
    characters: { '11111111-1111-4111-8111-111111111111': 'HERO' },
    bookmarked: false,
  },
  {
    uri: '10000000-0000-4000-8000-000000000002',
    title: 'Hamlet',
    author: 'William Shakespeare',
    lang: 'en',
    genre: 'tragedy',
    period: 'elizabethan',
    synopsis: null,
    numberOfRoles: 8,
    numberOfMaleRoles: 6,
    numberOfFemaleRoles: 2,
    numberOfWords: 42,
    characters: {},
    bookmarked: true,
  },
];

const listAllCalls: unknown[] = [];

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    playsCollection: {
      listAll: {
        queryOptions: (input: unknown) => {
          listAllCalls.push(input);
          return {
            queryKey: ['playsCollection.listAll', input],
            queryFn: async () => ({ scripts, total: 54, page: 1, pageSize: 20 }),
          };
        },
        queryKey: () => ['playsCollection.listAll'],
      },
      toggleBookmark: { mutationOptions: () => ({ mutationKey: ['toggleBookmark'] }) },
    },
    plays: {
      createFromCollection: { mutationOptions: () => ({ mutationKey: ['createFromCollection'] }) },
    },
  }),
}));

vi.mock('./collection-metadata.context', () => ({
  useCollectionMetadataContext: () => ({
    genres: ['comedy', 'tragedy'],
    periods: ['xviiith', 'elizabethan'],
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
  beforeEach(() => {
    localStorage.clear();
    listAllCalls.length = 0;
  });
  afterEach(() => cleanup());

  it('groups scripts under their author and shows item metadata + pagination', async () => {
    renderPick();

    expect(await screen.findByText("Le Jeu de l'amour et du hasard")).toBeTruthy();
    expect(screen.getByText('Hamlet')).toBeTruthy();
    expect(screen.getByText('Pierre de Marivaux')).toBeTruthy();
    expect(screen.getByText('William Shakespeare')).toBeTruthy();
    expect(screen.getByText(/FR · comedy · xviiith · 4 roles · 11 words/)).toBeTruthy();
    expect(screen.getByText(/Page 1 \/ 3 · 54 scripts/)).toBeTruthy();
  });

  it('keeps Next disabled until a script is selected, then shows details; close unselects', async () => {
    renderPick();

    const next = (await screen.findByRole('button', { name: 'Next', exact: true })) as HTMLButtonElement;
    expect(next.disabled).toBe(true);

    fireEvent.click(await screen.findByText("Le Jeu de l'amour et du hasard"));

    expect(screen.getByText(/Un valet et sa maîtresse échangent leurs rôles/)).toBeTruthy();
    expect(screen.getByText('HERO')).toBeTruthy();
    expect(next.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/Un valet et sa maîtresse/)).toBeNull();
    expect(next.disabled).toBe(true);
  });

  it('sends filters to the server and persists them in localStorage; Clear resets', async () => {
    renderPick();
    await screen.findByText("Le Jeu de l'amour et du hasard");
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'hamlet' } });

    // the query received the title filter
    await screen.findByText(/Page 1 \/ 3/);
    const lastCall = listAllCalls.at(-1) as { filters: { title?: string } };
    expect(lastCall.filters.title).toBe('hamlet');
    // persisted
    expect(JSON.parse(localStorage.getItem('marivo:collection-filters')!)).toMatchObject({
      title: 'hamlet',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(input.value).toBe('');
    expect(JSON.parse(localStorage.getItem('marivo:collection-filters')!)).toMatchObject({
      title: '',
    });
  });

  it('restores filters from localStorage on mount', async () => {
    localStorage.setItem(
      'marivo:collection-filters',
      JSON.stringify({ title: 'hamlet', author: '', languages: [], roles: [], maleRoles: [], femaleRoles: [], genres: ['tragedy'], periods: [], bookmarkedOnly: false }),
    );
    renderPick();
    await screen.findByText('Hamlet');
    const lastCall = listAllCalls.at(-1) as { filters: { title?: string; genres?: string[] } };
    expect(lastCall.filters.title).toBe('hamlet');
    expect(lastCall.filters.genres).toEqual(['tragedy']);
  });
});
