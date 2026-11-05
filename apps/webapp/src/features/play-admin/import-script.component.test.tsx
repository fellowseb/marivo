import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import ImportScript from './import-script.component';
import {
  ImportScriptContextProvider,
  useImportScriptContext,
} from './import-script.context';

let statusValue: unknown;
let statusShouldFail = false;
let statusCalls = 0;
let capturedImportId = '';
const SRV_IMPORT_ID = '20000000-0000-4000-8000-0000000000aa';
const RESUME_ID = '10000000-0000-4000-8000-000000000001';
const initMock = vi.fn().mockResolvedValue({ importId: SRV_IMPORT_ID });
const uploadMock = vi.fn().mockResolvedValue({});

vi.mock('../../trpc', () => ({
  useTRPC: () => ({
    plays: {
      initImportScript: {
        mutationOptions: (opts?: { onSuccess?: (data: { importId: string }) => void }) => ({
          mutationKey: ['initImportScript'],
          mutationFn: async () => {
            const data = await initMock();
            opts?.onSuccess?.(data);
            return data;
          },
        }),
      },
      uploadFileForScriptImport: {
        mutationOptions: () => ({ mutationKey: ['uploadFileForScriptImport'], mutationFn: uploadMock }),
        mutationKey: () => ['uploadFileForScriptImport'],
      },
      importScriptStatus: {
        queryOptions: (input: unknown) => {
          capturedImportId = (input as { importId: string }).importId;
          return {
            queryKey: ['importScriptStatus', input],
            queryFn: async () => {
              statusCalls += 1;
              if (statusShouldFail) {
                throw new Error('NOT_FOUND');
              }
              return { id: capturedImportId, ...(statusValue as object) };
            },
          };
        },
        queryKey: () => ['importScriptStatus'],
      },
    },
  }),
}));

function renderWithProviders(node: React.ReactNode, initialEntries?: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {node}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function Probe() {
  const ctx = useImportScriptContext();
  const step = ctx.step;
  return (
    <div data-testid="probe">
      {step
        ? JSON.stringify(
            step.name === 'import'
              ? { name: step.name, processing: step.processing, error: step.error ?? null }
              : { name: step.name },
          )
        : 'no-step'}
    </div>
  );
}

const REVIEWING = {
  status: 'reviewing',
  metadata: {
    title: 'Hamlet',
    author: 'Shakespeare',
    language: 'en',
    characters: [],
    number_of_roles: 1,
    number_of_male_roles: 1,
    number_of_female_roles: 0,
  },
};

describe('ImportScriptContext status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusShouldFail = false;
    statusCalls = 0;
    statusValue = { status: 'uploading_files', error: null };
  });
  afterEach(() => cleanup());

  const resumeAt = (id: string) => [`/plays/new/import?resume=${id}`];

  it('marks the import step as processing while files are processed', async () => {
    statusValue = { status: 'processing_files', error: null };
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
      resumeAt(RESUME_ID),
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('"processing":true'));
  });

  it('advances to preview on reviewing', async () => {
    statusValue = REVIEWING;
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
      resumeAt(RESUME_ID),
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('"name":"preview"'), {
      timeout: 9000,
    });
  });

  it('surfaces the worker error message on error status', async () => {
    statusValue = { status: 'error', error: 'LLM request failed' };
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
      resumeAt(RESUME_ID),
    );
    await waitFor(
      () => expect(screen.getByTestId('probe').textContent).toContain('LLM request failed'),
      { timeout: 9000 },
    );
  });

  it('surfaces an error when a resumed import no longer exists (query failure)', async () => {
    statusShouldFail = true;
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
      resumeAt(RESUME_ID),
    );
    await waitFor(
      () => expect(screen.getByTestId('probe').textContent).toContain('no longer available'),
      { timeout: 9000 },
    );
  });

  it('does NOT poll at all on a fresh page before init (importId is server-generated)', async () => {
    statusShouldFail = true;
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
    );
    // let several would-be poll ticks pass: the query is disabled (no id yet)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(statusCalls).toBe(0);
    expect(screen.getByTestId('probe').textContent).not.toContain('no longer available');
    expect(screen.getByTestId('probe').textContent).toContain('"name":"import"');
  });

  it(
    'shows the gone-error once the import existed and then disappeared',
    { timeout: 30000 },
    async () => {
    statusValue = { status: 'processing_files', error: null };
    renderWithProviders(
      <ImportScriptContextProvider>
        <Probe />
      </ImportScriptContextProvider>,
      resumeAt(RESUME_ID),
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('"processing":true'));
    // the row disappears server-side: polls start failing
    statusShouldFail = true;
    await waitFor(
      () => expect(screen.getByTestId('probe').textContent).toContain('no longer available'),
      { timeout: 9000 },
    );
    },
  );
});

describe('ImportScript page feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusShouldFail = false;
    statusValue = { status: 'processing_files', error: null };
  });
  afterEach(() => cleanup());

  it(
    'shows processing feedback after clicking Import, then the error with a Start over button',
    { timeout: 30000 },
    async () => {
    renderWithProviders(<ImportScript />);

    // select one file on the hidden input (FileList-like object with .item())
    const file = new File(['hello'], 'part1.txt');
    const fileList = { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) };
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: fileList } });
    expect(await screen.findByText('Selected script files: 1')).toBeTruthy();

    // start the import: init + upload resolve, status poll reports processing
    const importButton = screen.getByRole('button', { name: 'Import', exact: true }) as HTMLButtonElement;
    fireEvent.click(importButton);
    // the button must stay disabled from click until the processing poll
    // takes over (no flicker window where it re-enables)
    expect(importButton.disabled).toBe(true);
    expect(await screen.findByText(/Processing files…/)).toBeTruthy();
    expect(importButton.disabled).toBe(true);
    await waitFor(() => expect(initMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));

    // worker fails -> error alert with the reason + Start over
    statusValue = { status: 'error', error: 'LLM request failed' };
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy(), { timeout: 9000 });
    expect(screen.getByRole('alert').textContent).toContain('LLM request failed');
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    // files are preserved after starting over
    expect(screen.getByText('Selected script files: 1')).toBeTruthy();
    },
  );
});
