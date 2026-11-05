import Icon from '../../components/icon.component';
import { ItemListItem } from '../../components/item-list/item-list.component';
import styles from './collection-item.module.css';

interface CollectionItemProps {
  title: string;
  lang: string;
  genre: string | null;
  period: string | null;
  numberOfRoles: number | null;
  numberOfMaleRoles: number | null;
  numberOfFemaleRoles: number | null;
  bookmarked: boolean;
  archived: boolean;
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
    .join(' · ');
  return (
    <ItemListItem
      onClick={props.onSelect}
      selected={props.selected}
      title={
        <>
          {props.title}
          {props.archived ? <span className={styles.archivedBadge}>archived</span> : null}
        </>
      }
      trailing={
        props.bookmarked ? (
          <span className={styles.bookmark} role="img" aria-label="Bookmarked">
            <Icon value="memorize" size="medium" mode="primary" />
          </span>
        ) : null
      }
      details={<span className={styles.meta}>{meta}</span>}
    />
  );
}
