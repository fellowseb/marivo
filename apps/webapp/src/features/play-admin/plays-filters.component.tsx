import { useRef, useState } from 'react';
import styles from './plays-filters.module.css';
import type { PlayFilterSortOptions, PlaysOrdering } from './plays.lib';
import Button from '../../components/button.component';
import Icon from '../../components/icon.component';
import classNames from 'classnames';

export interface PlaysFiltersProps {
  filters: PlayFilterSortOptions;
  onFiltersChange: (options: PlayFilterSortOptions) => void;
}

export const DEFAULT_FILTER_OPTIONS: PlayFilterSortOptions = {
  orderBy: 'orderByLastModificationDateAsc',
  onlyPlaysSelfOwns: false,
  title: '',
};

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
      titleFilterRef.current.value = DEFAULT_FILTER_OPTIONS.title;
    }
    if (orderByRef.current) {
      orderByRef.current.value = DEFAULT_FILTER_OPTIONS.orderBy;
    }
    if (onlyPlaysSelfOwnsRef.current) {
      onlyPlaysSelfOwnsRef.current.checked =
        DEFAULT_FILTER_OPTIONS.onlyPlaysSelfOwns;
    }
    handleFiltersChange();
  };
  const [showFilters, setShowFilters] = useState(false);
  const handleShowFilters = () => {
    setShowFilters((prev) => !prev);
  };

  return (
    <div className={styles.playFilters}>
      <div className={styles.header}>
        <Button onClick={handleShowFilters} variant="discrete">
          <span className={styles.headerTitle}>
            <Icon value="filter" size="small" mode="primary" />
            Filters
          </span>
          <span
            className={classNames({
              [styles.arrow]: true,
              [styles.arrowDown]: showFilters,
            })}
          >
            ▶
          </span>
        </Button>
      </div>
      <div
        className={classNames({
          [styles.content]: true,
          [styles.hidden]: !showFilters,
        })}
      >
        <div className={styles.formGrid}>
          <label>Title:</label>
          <input
            type="text"
            id="filter-title"
            onChange={handleFiltersChange}
            ref={titleFilterRef}
            size={16}
            value={props.filters.title}
          />
          <label>Sort by:</label>
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
          <label>Plays I own only</label>
          <input
            type="checkbox"
            onChange={handleFiltersChange}
            ref={onlyPlaysSelfOwnsRef}
            checked={props.filters.onlyPlaysSelfOwns}
          />
        </div>
        <Button onClick={handleClearClick} icon="clear">
          Clear
        </Button>
      </div>
    </div>
  );
}

export default PlaysFilters;
