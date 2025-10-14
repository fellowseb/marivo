import { useRef } from 'react';
import styles from './plays-filters.module.css';
import type { PlayFilterSortOptions, PlaysOrdering } from './plays.lib';

export interface PlaysFiltersProps {
  onFiltersChange: (options: PlayFilterSortOptions) => void;
}

function PlaysFilters(props: PlaysFiltersProps) {
  const titleFilterRef = useRef<HTMLInputElement>(null);
  const orderByRef = useRef<HTMLSelectElement>(null);
  const onlyPlaysSelfOwnsRef = useRef<HTMLInputElement>(null);
  const handleFiltersChange = () => {
    props.onFiltersChange({
      title: titleFilterRef.current?.value?.toLowerCase(),
      orderBy: orderByRef.current?.value as PlaysOrdering,
      onlyPlaysSelfOwns: onlyPlaysSelfOwnsRef.current?.checked,
    });
  };
  const handleClearClick = () => {
    if (titleFilterRef.current) {
      titleFilterRef.current.value = '';
    }
    if (orderByRef.current) {
      orderByRef.current.value =
        'orderByLastModificationDateDesc' satisfies PlaysOrdering;
    }
    if (onlyPlaysSelfOwnsRef.current) {
      onlyPlaysSelfOwnsRef.current.checked = false;
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
      />
      <select onChange={handleFiltersChange} ref={orderByRef}>
        <option
          value={'orderByLastModificationDateAsc' satisfies PlaysOrdering}
        >
          Last modification date ↑
        </option>
        <option
          value={'orderByLastModificationDateDesc' satisfies PlaysOrdering}
        >
          Last modification date ↓
        </option>
        <option value={'orderByCreationDateAsc' satisfies PlaysOrdering}>
          Creation date ↑
        </option>
        <option value={'orderByCreationDateDesc' satisfies PlaysOrdering}>
          Creation date ↓
        </option>
        <option value={'orderByTitleAsc' satisfies PlaysOrdering}>
          Title ↑
        </option>
        <option value={'orderByTitleDesc' satisfies PlaysOrdering}>
          Title ↓
        </option>
      </select>
      <label>Plays I own</label>
      <input
        type="checkbox"
        onChange={handleFiltersChange}
        ref={onlyPlaysSelfOwnsRef}
      />
      <button onClick={handleClearClick}>↺ Clear</button>
    </div>
  );
}

export default PlaysFilters;
