import classNames from 'classnames';
import styles from './plays-page-toolbar.module.css';

function PlaysPageToolbar() {
  return (
    <nav className={styles.toolbar}>
      <a className={styles.toolbarItem}>
        <div
          className={classNames([styles.toolbarIconFilter, styles.toolbarIcon])}
        />
        filter
      </a>
    </nav>
  );
}

export default PlaysPageToolbar;
