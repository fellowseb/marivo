import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { NamePlayStep, type PlayMetadataDetails, type PublishToCollectionInput } from './name-play-step.component';
import {
  NotificationsContextProvider,
  useNotificationsDisplay,
} from '../../components/notifications.context';

const navigateMock = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
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
  const publishToCollection =
    props.publishToCollection ?? vi.fn().mockResolvedValue({ uri: 'collection-uri-1' });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationsContextProvider>
          <NamePlayStep
            onBack={() => undefined}
            {...props}
            createPlay={createPlay}
            publishToCollection={publishToCollection}
          />
          <NotificationsProbe />
        </NotificationsContextProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { createPlay, publishToCollection };
}

function NotificationsProbe() {
  const { notifications } = useNotificationsDisplay();
  return (
    <div data-testid="notifications">
      {notifications.map((n) => n.message).join('|')}
    </div>
  );
}

describe('NamePlayStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('hides the commons section when allowAddToCommons is false', () => {
    renderStep({ allowAddToCommons: false, metadata });
    expect(screen.queryByText('Add to commons library')).toBeNull();
  });

  it('shows an inline error and stays put when creation fails', async () => {
    const createPlay = vi.fn().mockRejectedValue(new Error('Script import not found'));
    renderStep({ createPlay });
    fireEvent.change(screen.getByPlaceholderText(/Othello/), { target: { value: 'My project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Script import not found');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('creates the play without publishing when the toggle is off', async () => {
    const { createPlay, publishToCollection } = renderStep({ allowAddToCommons: true, metadata });
    fireEvent.change(screen.getByPlaceholderText(/Othello/), { target: { value: 'My project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ pathname: '/plays/edit/play-uri-123' }));
    expect(createPlay).toHaveBeenCalledWith('My project');
    expect(publishToCollection).not.toHaveBeenCalled();
  });

  it('in commons mode: editable metadata, create publishes to the collection (no personal play) and navigates to the collection editor', async () => {
    const { createPlay, publishToCollection } = renderStep({ allowAddToCommons: true, metadata });
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

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ pathname: '/collection/edit/collection-uri-1' }),
    );
    // success notification mentions the archived landing
    expect(screen.getByTestId('notifications').textContent).toContain('archived');
    // no personal play is created in commons mode
    expect(createPlay).not.toHaveBeenCalled();
    expect(publishToCollection).toHaveBeenCalledTimes(1);
    expect(publishToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tartuffe v2',
        author: 'Jean-Baptiste Poquelin',
        lang: 'fr',
        numberOfRoles: 9,
        numberOfMaleRoles: 6,
        numberOfFemaleRoles: 3,
        genre: 'comedy',
        period: 'xviiith',
      } satisfies Partial<PublishToCollectionInput>),
    );
  });

  it('on publish failure shows an error, does not navigate, and Retry publishes again', async () => {
    const { publishToCollection } = renderStep({ allowAddToCommons: true, metadata });
    (publishToCollection as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('FORBIDDEN'));
    fireEvent.click(screen.getByRole('checkbox'));
    const titleInput = await screen.findByDisplayValue('Tartuffe');
    fireEvent.change(titleInput, { target: { value: 'Tartuffe edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    // error shown, no navigation yet
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(publishToCollection).toHaveBeenCalledTimes(1);

    // retry succeeds -> navigates to the collection editor
    fireEvent.click(screen.getByRole('button', { name: 'Retry publish' }));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ pathname: '/collection/edit/collection-uri-1' }),
    );
    expect(publishToCollection).toHaveBeenCalledTimes(2);
    expect(publishToCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Tartuffe edited' }),
    );
  });
});
