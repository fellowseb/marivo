import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';
import Button from '../../components/button.component';
import styles from './script-imports-page.module.css';

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

interface ScriptImport {
  id: string;
  status: 'uploading_files' | 'processing_files' | 'reviewing' | 'done' | 'error';
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

function getStatusVariant(status: ScriptImport['status']): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'uploading_files':
    case 'processing_files':
      return 'info';
    case 'reviewing':
      return 'warning';
    case 'done':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

function ScriptImportRow({ imp }: { imp: ScriptImport }) {
  const statusLabel = getStatusLabel(imp.status);
  const statusVariant = getStatusVariant(imp.status);
  const isOngoing = ['uploading_files', 'processing_files', 'reviewing'].includes(imp.status);
  const isReviewing = imp.status === 'reviewing';

  const statusBadgeClassName = {
    info: styles.statusBadgeInfo,
    success: styles.statusBadgeSuccess,
    warning: styles.statusBadgeWarning,
    error: styles.statusBadgeError,
  }[statusVariant];

  return (
    <tr
      className={isOngoing ? styles.ongoingRow : styles.doneRow}
    >
      <td className={styles.idCell}>{imp.id}</td>
      <td className={styles.statusCell}>
        <span className={statusBadgeClassName}>
          {statusLabel}
        </span>
      </td>
      <td className={styles.actionsCell}>
        {isReviewing && (
          <NavLink to={`/plays/new/import?resume=${imp.id}`}>
            <Button icon="next" variant="standout">
              Resume
            </Button>
          </NavLink>
        )}
      </td>
    </tr>
  );
}

export function ScriptImportsPage() {
  const trpc = useTRPC();
  const queryOpts = trpc.plays.allScriptImports.queryOptions();
  const { data, isLoading, isError, refetch } = useQuery(queryOpts);

  const ongoingImports = data?.filter((imp) =>
    ['uploading_files', 'processing_files', 'reviewing'].includes(imp.status)
  ) ?? [];
  const pastImports = data?.filter((imp) =>
    ['done', 'error'].includes(imp.status)
  ) ?? [];

  return (
    <FlowStep
      title="Script Imports"
      Actions={
        <Button icon="refresh" onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      {isLoading && <p>Loading script imports...</p>}
      {isError && <p className={styles.error}>Failed to load script imports.</p>}
      {data && data.length === 0 && (
        <p className={styles.empty}>No script imports found.</p>
      )}
      {data && data.length > 0 && (
        <div className={styles.container}>
          <div className={styles.section}>
            <h3>Ongoing Imports ({ongoingImports.length})</h3>
            {ongoingImports.length === 0 ? (
              <p className={styles.emptySection}>No ongoing imports.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.idHeader}>Import ID</th>
                    <th className={styles.statusHeader}>Status</th>
                    <th className={styles.actionsHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingImports.map((imp) => (
                    <ScriptImportRow key={imp.id} imp={imp} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className={styles.section}>
            <h3>Past Imports ({pastImports.length})</h3>
            {pastImports.length === 0 ? (
              <p className={styles.emptySection}>No past imports.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.idHeader}>Import ID</th>
                    <th className={styles.statusHeader}>Status</th>
                    <th className={styles.actionsHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastImports.map((imp) => (
                    <ScriptImportRow key={imp.id} imp={imp} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </FlowStep>
  );
}

export default ScriptImportsPage;
