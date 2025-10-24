import { useRef } from 'react';
import styles from './plays-filters.module.css';
import type { PlayFilterSortOptions, PlaysOrdering } from './plays.lib';
import Button from '../../components/button.components';
import Icon from '../../components/icon.component';

export interface PlaysFiltersProps {
  filters: PlayFilterSortOptions;
  onFiltersChange: (options: PlayFilterSortOptions) => void;
}

function PlaysFilters(props: PlaysFiltersProps) {
  const titleFilterRef = useRef<HTMLInputElement>(null);
  const orderByRef = useRef<HTMLSelectElement>(null);
  const onlyPlaysSelfOwnsRef = useRef<HTMLInputElement>(null);
  const handleFiltersChange = () => {
    props.onFiltersChange({
      title: titleFilterRef.current?.value?.toLowerCase() ?? '',
      orderBy: orderByRef.current?.value as PlaysOrdering,
      onlyPlaysSelfOwns: onlyPlaysSelfOwnsRef.current?.checked ?? false,
    });
  };
  const handleClearClick = () => {
    if (titleFilterRef.current) {
      titleFilterRef.current.value = '';
    }
    if (orderByRef.current) {
      orderByRef.current.value = props.filters.orderBy;
    }
    if (onlyPlaysSelfOwnsRef.current) {
      onlyPlaysSelfOwnsRef.current.checked = props.filters.onlyPlaysSelfOwns;
    }
    handleFiltersChange();
  };

  return (
    <div className={styles.playFilters}>
      <input
        type="text"
        id="filter-title"
        placeholder="Filter by title..."
        onChange={handleFiltersChange}
        ref={titleFilterRef}
        size={16}
        value={props.filters.title}
      />
      <select
        onChange={handleFiltersChange}
        ref={orderByRef}
        value={props.filters.orderBy}
      >
        <button>
          <selectedcontent></selectedcontent>
        </button>
        <option
          value={'orderByLastModificationDateAsc' satisfies PlaysOrdering}
        >
          Last modification date
          <Icon value="asc" size="small" mode="primary" />
        </option>
        <option
          value={'orderByLastModificationDateDesc' satisfies PlaysOrdering}
        >
          Last modification date
          <Icon value="desc" size="small" mode="primary" />
        </option>
        <option value={'orderByCreationDateAsc' satisfies PlaysOrdering}>
          Creation date
          <Icon value="asc" size="small" mode="primary" />
        </option>
        <option value={'orderByCreationDateDesc' satisfies PlaysOrdering}>
          Creation date
          <Icon value="desc" size="small" mode="primary" />
        </option>
        <option value={'orderByTitleAsc' satisfies PlaysOrdering}>
          Title
          <Icon value="asc" size="small" mode="primary" />
        </option>
        <option value={'orderByTitleDesc' satisfies PlaysOrdering}>
          Title
          <Icon value="desc" size="small" mode="primary" />
        </option>
      </select>
      <label>Plays I own</label>
      <input
        type="checkbox"
        onChange={handleFiltersChange}
        ref={onlyPlaysSelfOwnsRef}
        checked={props.filters.onlyPlaysSelfOwns}
      />
      <Button onClick={handleClearClick} icon="clear">
        Clear
      </Button>
    </div>
  );
}

export default PlaysFilters;
