import styles from './import-filters.module.css';
import Button from '../../components/button.component';
import Icon from '../../components/icon.component';
import CollapsibleSection from '../../components/collapsible-section.component';

export type ImportStatus = 'uploading_files' | 'processing_files' | 'reviewing';

export interface ImportFiltersProps {
  statuses: ImportStatus[];
  onStatusesChange: (statuses: ImportStatus[]) => void;
}

const ALL_STATUS_OPTIONS: ImportStatus[] = [
  'uploading_files',
  'processing_files',
  'reviewing',
];

function getStatusLabel(status: ImportStatus): string {
  switch (status) {
    case 'uploading_files':
      return 'Uploading files';
    case 'processing_files':
      return 'Processing files';
    case 'reviewing':
      return 'Reviewing';
    default:
      return status;
  }
}

interface ImportFiltersHeaderProps {
  collapsed: boolean;
}

function ImportFiltersHeader(props: ImportFiltersHeaderProps) {
  return (
    <div className={styles.header}>
      <span className={styles.headerTitle}>
        <Icon value="filter" size="small" mode="primary" />
        Filter by status
      </span>
      <span className={styles.arrowDown}>
        {props.collapsed ? '▼' : '▲'}
      </span>
    </div>
  );
}

function ImportFilters(props: ImportFiltersProps) {
  const handleToggleStatus = (status: ImportStatus) => {
    const newStatuses = props.statuses.includes(status)
      ? props.statuses.filter((s) => s !== status)
      : [...props.statuses, status];
    props.onStatusesChange(newStatuses);
  };

  const handleClearClick = () => {
    props.onStatusesChange(ALL_STATUS_OPTIONS);
  };

  const allSelected = ALL_STATUS_OPTIONS.every((s) => props.statuses.includes(s));

  return (
    <div className={styles.importFilters}>
      <CollapsibleSection
        Header={<ImportFiltersHeader collapsed={true} />}
        HeaderExpanded={<ImportFiltersHeader collapsed={false} />}
      >
        <div className={styles.content}>
          <div className={styles.statusOptions}>
            {ALL_STATUS_OPTIONS.map((status) => {
              const isChecked = props.statuses.includes(status);
              return (
                <label key={status} className={styles.statusOption}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleStatus(status)}
                  />
                  {getStatusLabel(status)}
                </label>
              );
            })}
          </div>
          <Button onClick={handleClearClick} icon="clear">
            Clear
          </Button>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default ImportFilters;
