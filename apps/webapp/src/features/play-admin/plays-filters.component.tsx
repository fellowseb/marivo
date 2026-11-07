import { useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./plays-filters.module.css";
import type { PlayFilterSortOptions, PlaysOrdering } from "./plays.lib";
import Button from "../../components/button.component";
import Container from "../../components/container.component";
import Icon from "../../components/icon.component";
import classNames from "classnames";
import CollapsibleSection from "../../components/collapsible-section.component";

interface PlaysFiltersHeaderProps {
  collapsed: boolean;
}

function PlaysFiltersHeader(props: PlaysFiltersHeaderProps) {
  const { t } = useTranslation("plays");
  return (
    <div className={styles.header}>
      <span className={styles.headerTitle}>
        <Icon value="filter" size="small" mode="primary" />
        {t("filters.title")}
      </span>
      <span
        className={classNames({
          [styles.arrow]: true,
          [styles.arrowDown]: !props.collapsed,
        })}
      >
        ▶
      </span>
    </div>
  );
}

export interface PlaysFiltersProps {
  filters: PlayFilterSortOptions;
  onFiltersChange: (options: PlayFilterSortOptions) => void;
}

export const DEFAULT_FILTER_OPTIONS: PlayFilterSortOptions = {
  orderBy: "orderByLastModificationDateAsc",
  onlyPlaysSelfOwns: false,
  title: "",
};

function PlaysFilters(props: PlaysFiltersProps) {
  const { t } = useTranslation("plays");
  const titleFilterRef = useRef<HTMLInputElement>(null);
  const orderByRef = useRef<HTMLSelectElement>(null);
  const onlyPlaysSelfOwnsRef = useRef<HTMLInputElement>(null);
  const handleFiltersChange = () => {
    props.onFiltersChange({
      title: titleFilterRef.current?.value?.toLowerCase() ?? "",
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
      onlyPlaysSelfOwnsRef.current.checked = DEFAULT_FILTER_OPTIONS.onlyPlaysSelfOwns;
    }
    handleFiltersChange();
  };

  return (
    <Container className={styles.playFilters}>
      <CollapsibleSection
        Header={<PlaysFiltersHeader collapsed={true} />}
        HeaderExpanded={<PlaysFiltersHeader collapsed={false} />}
      >
        <div className={styles.content}>
          <div className={styles.formGrid}>
            <label>{t("filters.titleLabel")}</label>
            <input
              type="text"
              id="filter-title"
              onChange={handleFiltersChange}
              ref={titleFilterRef}
              size={16}
              value={props.filters.title}
            />
            <label>{t("filters.sortByLabel")}</label>
            <select onChange={handleFiltersChange} ref={orderByRef} value={props.filters.orderBy}>
              <button>
                <selectedcontent></selectedcontent>
              </button>
              <option value={"orderByLastModificationDateAsc" satisfies PlaysOrdering}>
                {t("filters.order.lastModification")}
                <Icon value="asc" size="small" mode="primary" />
              </option>
              <option value={"orderByLastModificationDateDesc" satisfies PlaysOrdering}>
                {t("filters.order.lastModification")}
                <Icon value="desc" size="small" mode="primary" />
              </option>
              <option value={"orderByCreationDateAsc" satisfies PlaysOrdering}>
                {t("filters.order.creationDate")}
                <Icon value="asc" size="small" mode="primary" />
              </option>
              <option value={"orderByCreationDateDesc" satisfies PlaysOrdering}>
                {t("filters.order.creationDate")}
                <Icon value="desc" size="small" mode="primary" />
              </option>
              <option value={"orderByTitleAsc" satisfies PlaysOrdering}>
                {t("filters.order.title")}
                <Icon value="asc" size="small" mode="primary" />
              </option>
              <option value={"orderByTitleDesc" satisfies PlaysOrdering}>
                {t("filters.order.title")}
                <Icon value="desc" size="small" mode="primary" />
              </option>
            </select>
            <label>{t("filters.onlyOwnedLabel")}</label>
            <input
              type="checkbox"
              onChange={handleFiltersChange}
              ref={onlyPlaysSelfOwnsRef}
              checked={props.filters.onlyPlaysSelfOwns}
            />
          </div>
          <Button onClick={handleClearClick} icon="clear">
            {t("filters.clear")}
          </Button>
        </div>
      </CollapsibleSection>
    </Container>
  );
}

export default PlaysFilters;
