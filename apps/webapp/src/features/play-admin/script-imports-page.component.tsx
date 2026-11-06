import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import Skeleton from '../../components/skeleton.component';
import DotsLoader from '../../components/dots-loader.component';
import Button from '../../components/button.component';
import styles from './script-imports-page.module.css';
import ImportFilters from './import-filters.component';
import type { ImportStatus } from './import-filters.component';

interface ScriptImport {
  id: string;
  status:
    | 'uploading_files'
    | 'processing_files'
    | 'reviewing'
    | 'done'
    | 'error';
  error: string | null;
}

function getStatusLabel(status: ScriptImport['status']): string {
  switch (status) {
    case 'uploading_files':
      return 'Uploading files';
    case 'processing_files':
      return 'Processing files';
    case 'reviewing':
      return 'Reviewing';
    case 'done':
      return 'Done';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function getStatusVariant(
  status: ScriptImport['status'],
): 'ongoing' | 'done' | 'error' {
  switch (status) {
    case 'uploading_files':
    case 'processing_files':
    case 'reviewing':
      return 'ongoing';
    case 'done':
      return 'done';
    case 'error':
      return 'error';
    default:
      return 'ongoing';
  }
}

interface ScriptImportItemProps {
  imp: ScriptImport;
}

function ScriptImportItem({ imp }: ScriptImportItemProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [resuming, setResuming] = useState(false);
  const statusLabel = getStatusLabel(imp.status);
  const statusVariant = getStatusVariant(imp.status);
  const isOngoing = [
    'uploading_files',
    'processing_files',
    'reviewing',
  ].includes(imp.status);
  const isReviewing = imp.status === 'reviewing';

  // On Resume: disable the button with a waiting icon, prefetch the script
  // into the cache, then navigate — so the flow lands directly on the preview.
  const handleResume = async () => {
    if (resuming || !isReviewing) {
      return;
    }
    setResuming(true);
    await queryClient.prefetchQuery(
      trpc.script.latestChanges.queryOptions({
        since: new Date(0),
        uri: imp.id,
        from: 'import',
      }),
    );
    navigate(`/plays/new/import?resume=${imp.id}`);
  };

  return (
    <li className={styles.scriptImport}>
      <div className={styles.scriptImportContent}>
        <div className={styles.scriptImportTitle}>{imp.id}</div>
        <div className={styles.scriptImportDetails}>
          Status:{' '}
          <span
            className={
              styles[
                `statusBadge${statusVariant.charAt(0).toUpperCase() + statusVariant.slice(1)}`
              ]
            }
          >
            {statusLabel}
          </span>
        </div>
        {imp.status === "error" && imp.error ? (
          <div className={styles.scriptImportDetails} style={{ color: "var(--color-error)" }}>
            {imp.error}
          </div>
        ) : null}
        {isOngoing && (
          <div className={styles.scriptImportActions}>
            <Button
              icon={resuming || !isReviewing ? "animatedWaiting" : "next"}
              variant="standout"
              disabled={!isReviewing || resuming}
              onClick={handleResume}
            >
              Resume
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function NoScriptImports() {
  return (
    <div className={styles.noImportsContainer}>
      <p>You haven't started any script imports yet.</p>
    </div>
  );
}

export function ScriptImportsPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="script-imports"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: '/plays/imports',
          }}
        >
          Script imports
        </NavLink>,
      ]}
    />
  );
}

export function ScriptImportsPage() {
  const trpc = useTRPC();
  const queryOpts = trpc.plays.allScriptImports.queryOptions();
  // Poll so statuses (and the Resume gating) update while the user waits.
  queryOpts.refetchInterval = 5000;
  const { data, isLoading, isError, isRefetching, refetch } =
    useQuery(queryOpts);

  const allOngoingImports =
    data?.filter((imp) =>
      ['uploading_files', 'processing_files', 'reviewing'].includes(imp.status),
    ) ?? [];
  const pastImports =
    data?.filter((imp) => ['done', 'error'].includes(imp.status)) ?? [];

  const [statusFilters, setStatusFilters] = useState<ImportStatus[]>([
    'uploading_files',
    'processing_files',
    'reviewing',
  ]);

  const ongoingImports = allOngoingImports.filter((imp) =>
    statusFilters.includes(imp.status as ImportStatus),
  );

  return (
    <div className={styles.container}>
      {isError ? (
        <div className={styles.error}>Failed to load script imports.</div>
      ) : isLoading ? (
        <ul className={styles.scriptImports}>
          <li className={styles.scriptImportSkeleton}>
            <Skeleton hideImage={true} />
          </li>
          <li className={styles.scriptImportSkeleton}>
            <Skeleton hideImage={true} />
          </li>
          <li className={styles.scriptImportSkeleton}>
            <Skeleton hideImage={true} />
          </li>
        </ul>
      ) : data && data.length === 0 ? (
        <NoScriptImports />
      ) : (
        <>
          {allOngoingImports.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>
                Ongoing Imports ({ongoingImports.length})
              </h3>
              <div className={styles.filtersContainer}>
                <ImportFilters
                  statuses={statusFilters}
                  onStatusesChange={setStatusFilters}
                />
              </div>
              <ul className={styles.scriptImports}>
                {ongoingImports.map((imp) => (
                  <ScriptImportItem key={imp.id} imp={imp} />
                ))}
              </ul>
            </>
          )}
          {pastImports.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>
                Past Imports ({pastImports.length})
              </h3>
              <ul className={styles.scriptImports}>
                {pastImports.map((imp) => (
                  <ScriptImportItem key={imp.id} imp={imp} />
                ))}
              </ul>
            </>
          )}
          <div className={styles.importsActions}>
            <Button icon="refresh" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </>
      )}
      {isRefetching ? (
        <div className={styles.loaderContainer}>
          <DotsLoader />
        </div>
      ) : null}
    </div>
  );
}

export default ScriptImportsPage;
