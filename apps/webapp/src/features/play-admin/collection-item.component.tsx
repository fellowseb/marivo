import classNames from 'classnames';
import Icon from '../../components/icon.component';
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
    <div
      className={classNames(styles.container, {
        [styles.selected]: props.selected,
      })}
      onClick={props.onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') props.onSelect();
      }}
    >
      <div className={styles.text}>
        <div className={styles.title}>
          {props.title}
          <span className={styles.bookmark} role="img" aria-label="Bookmarked">
            {props.bookmarked ? (
              <Icon value="memorize" size="medium" mode="primary" />
            ) : null}
          </span>{' '}
        </div>
        <div className={styles.meta}>{meta}</div>
      </div>
    </div>
  );
}
