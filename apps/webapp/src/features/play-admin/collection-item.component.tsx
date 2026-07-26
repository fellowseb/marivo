import styles from './collection-item.module.css';

interface CollectionItemProps {
  scriptTitle: string;
  scriptAuthor: string;
}

export function CollectionItem(props: CollectionItemProps) {
  return <div className={styles.container}>{props.scriptTitle}</div>;
}
