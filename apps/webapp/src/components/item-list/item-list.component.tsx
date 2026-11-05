import classNames from "classnames";
import { NavLink } from "react-router";
import type { PropsWithChildren, ReactNode } from "react";
import styles from "./item-list.module.css";

interface ItemListProps {
  className?: string;
}

/** Scrollable, bordered list container shared by list pages (plays, collection, …). */
export function ItemList(props: PropsWithChildren<ItemListProps>) {
  return <ul className={classNames(styles.list, props.className)}>{props.children}</ul>;
}

interface ItemListItemProps {
  /** Title (rendered in the display font); badges/icons go in `trailing`. */
  title: ReactNode;
  /** Meta/details block under the title. */
  details?: ReactNode;
  /** Extra content at the right of the title row (heart, badges…). */
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /** NavLink destination; when omitted the item is a button with onClick. */
  to?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/** A row in an ItemList: bordered card with accent left bar, hover/focus/selected states. */
export function ItemListItem(props: PropsWithChildren<ItemListItemProps>) {
  const linkClass = classNames(styles.link, {
    [styles.selected]: props.selected,
    [styles.disabled]: props.disabled,
  });
  const inner = (
    <>
      <div className={styles.titleRow}>
        <span className={styles.title}>{props.title}</span>
        {props.trailing ? <span className={styles.trailing}>{props.trailing}</span> : null}
      </div>
      {props.details ? <div className={styles.details}>{props.details}</div> : null}
      {props.children}
    </>
  );
  return (
    <li className={styles.item}>
      {props.to ? (
        <NavLink to={{ pathname: props.to }} className={linkClass} aria-label={props.ariaLabel}>
          {inner}
        </NavLink>
      ) : (
        <button
          type="button"
          className={linkClass}
          onClick={props.onClick}
          disabled={props.disabled}
          aria-label={props.ariaLabel}
        >
          {inner}
        </button>
      )}
    </li>
  );
}
