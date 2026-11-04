import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { NamePlayStep, type PlayMetadataDetails } from './name-play-step.component';

const navigateMock = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const addToCollectionMock = vi.fn();

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    playsCollection: {
      addToCollection: {
        mutationOptions: () => ({ mutationKey: ['addToCollection'], mutationFn: addToCollectionMock }),
      },
    },
    plays: {
      playDetails: {
        queryOptions: (input: unknown) => ({
          queryKey: ['playDetails', input],
          queryFn: async () => ({ uri: (input as { uri: string }).uri }),
        }),
      },
    },
  }),
}));

vi.mock('./collection-metadata.context', () => ({
  useCollectionMetadataContext: () => ({ genres: ['comedy', 'tragedy'], periods: ['xviiith'], count: 2 }),
}));

const metadata: PlayMetadataDetails = {
  title: 'Tartuffe',
  author: 'Molière',
  language: 'fr',
  number_of_roles: 9,
  number_of_male_roles: 6,
  number_of_female_roles: 3,
  genre: 'comedy',
  period: 'xviiith',
};

function renderStep(props: Partial<Parameters<typeof NamePlayStep>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const createPlay = props.createPlay ?? vi.fn().mockResolvedValue({ uri: 'play-uri-123' });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NamePlayStep onBack={() => undefined} createPlay={createPlay} {...props} createPlay={createPlay} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { createPlay };
}

describe('NamePlayStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addToCollectionMock.mockResolvedValue({ uri: 'collection-uri-1' });
  });
  afterEach(() => cleanup());

  it('hides the commons section when allowAddToCommons is false', () => {
    renderStep({ allowAddToCommons: false, metadata });
    expect(screen.queryByText('Add to commons library')).toBeNull();
  });

  it('creates the play without publishing when the toggle is off', async () => {
    const { createPlay } = renderStep({ allowAddToCommons: true, metadata });
    fireEvent.change(screen.getByPlaceholderText(/Othello/), { target: { value: 'My project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ pathname: '/plays/edit/play-uri-123' }));
    expect(createPlay).toHaveBeenCalledWith('My project');
    expect(addToCollectionMock).not.toHaveBeenCalled();
  });

  it('in commons mode: editable metadata, create publishes to the collection then navigates', async () => {
    const { createPlay } = renderStep({ allowAddToCommons: true, metadata });
    // toggle the commons section on
    fireEvent.click(screen.getByRole('checkbox'));
    // the metadata form is shown, pre-filled; Create is enabled without editing
    const titleInput = await screen.findByDisplayValue('Tartuffe');
    const createButton = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);
    fireEvent.change(titleInput, { target: { value: 'Tartuffe v2' } });
    const authorInput = screen.getByDisplayValue('Molière');
    fireEvent.change(authorInput, { target: { value: 'Jean-Baptiste Poquelin' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ pathname: '/plays/edit/play-uri-123' }));
    expect(createPlay).toHaveBeenCalledWith('Tartuffe v2');
    expect(addToCollectionMock).toHaveBeenCalledTimes(1);
    expect(addToCollectionMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        playUri: 'play-uri-123',
        title: 'Tartuffe v2',
        author: 'Jean-Baptiste Poquelin',
        lang: 'fr',
        numberOfRoles: 9,
        numberOfMaleRoles: 6,
        numberOfFemaleRoles: 3,
        genre: 'comedy',
        period: 'xviiith',
      }),
    );
  });

  it('on publish failure shows an error, does not navigate, and Retry publishes again', async () => {
    addToCollectionMock.mockRejectedValueOnce(new Error('FORBIDDEN'));
    renderStep({ allowAddToCommons: true, metadata });
    fireEvent.click(screen.getByRole('checkbox'));
    const titleInput = await screen.findByDisplayValue('Tartuffe');
    fireEvent.change(titleInput, { target: { value: 'Tartuffe edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    // error shown, no navigation yet
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(addToCollectionMock).toHaveBeenCalledTimes(1);

    // retry succeeds -> navigates
    fireEvent.click(screen.getByRole('button', { name: 'Retry publish' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ pathname: '/plays/edit/play-uri-123' }));
    expect(addToCollectionMock).toHaveBeenCalledTimes(2);
    expect(addToCollectionMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({ playUri: 'play-uri-123', title: 'Tartuffe edited' }),
    );
  });
});
