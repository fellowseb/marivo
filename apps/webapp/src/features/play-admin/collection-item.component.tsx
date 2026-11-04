import classNames from "classnames";
import styles from "./collection-item.module.css";

interface CollectionItemProps {
  title: string;
  lang: string;
  genre: string | null;
  period: string | null;
  numberOfRoles: number | null;
  numberOfWords: number;
  selected: boolean;
  onSelect: () => void;
}

export function CollectionItem(props: CollectionItemProps) {
  const meta = [
    props.lang.toUpperCase(),
    props.genre,
    props.period,
    props.numberOfRoles != null ? `${props.numberOfRoles} roles` : null,
    `${props.numberOfWords} words`,
  ]
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
