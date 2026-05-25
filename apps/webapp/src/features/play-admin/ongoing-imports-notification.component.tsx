import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import { NavLink } from 'react-router';
import Button from '../../components/button.component';
import Admonition from '../../components/admonition.component';
import styles from './ongoing-imports-notification.module.css';

interface ScriptImport {
  id: string;
  status: 'uploading_files' | 'processing_files' | 'reviewing' | 'done' | 'error';
}

export function OngoingImportsNotification() {
  const trpc = useTRPC();
  const queryOpts = trpc.plays.allScriptImports.queryOptions();
  const { data, isLoading, isError } = useQuery(queryOpts);

  const ongoingImports = data?.filter((imp: ScriptImport) =>
    ['uploading_files', 'processing_files', 'reviewing'].includes(imp.status)
  ) ?? [];

  if (isLoading) {
    return null;
  }

  if (isError || ongoingImports.length === 0) {
    return null;
  }

  return (
    <Admonition type="info">
      <div className={styles.notificationContent}>
        <span>
          You have <strong>{ongoingImports.length}</strong> ongoing script import{
            ongoingImports.length > 1 ? 's' : ''
          }.
        </span>
        <NavLink to="/plays/imports">
          <Button
            icon="next"
            variant="standout"
            customClassNames={[styles.viewButton]}
          >
            View Imports
          </Button>
        </NavLink>
      </div>
    </Admonition>
  );
}

export default OngoingImportsNotification;
