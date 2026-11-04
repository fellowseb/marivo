import classNames from "classnames";
import styles from "./collection-item.module.css";

interface CollectionItemProps {
  title: string;
  lang: string;
  genre: string | null;
  period: string | null;
  numberOfRoles: number | null;
  numberOfMaleRoles: number | null;
  numberOfFemaleRoles: number | null;
  selected: boolean;
  onSelect: () => void;
}

export function CollectionItem(props: CollectionItemProps) {
  const roles =
    props.numberOfMaleRoles != null && props.numberOfFemaleRoles != null
      ? `${props.numberOfMaleRoles} male + ${props.numberOfFemaleRoles} female`
      : props.numberOfRoles != null
        ? `${props.numberOfRoles} roles`
        : null;
  const meta = [props.lang.toUpperCase(), props.genre, props.period, roles]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className={classNames(styles.container, { [styles.selected]: props.selected })}
      onClick={props.onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") props.onSelect();
      }}
    >
      <div className={styles.title}>{props.title}</div>
      <div className={styles.meta}>{meta}</div>
    </div>
  );
}
