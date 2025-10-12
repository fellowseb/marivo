import classNames from 'classnames';
import styles from './blocking-tab-menu.module.css';

function BlockingTabMenu() {
  return (
    <nav className={styles.playScriptMenu}>
      <a
        className={classNames([
          styles.playScriptMenuItem,
          styles.playScriptMenuItemUndo,
        ])}
      ></a>
      <a
        className={classNames([
          styles.playScriptMenuItem,
          styles.playScriptMenuItemRedo,
        ])}
      ></a>
      <a
        className={classNames([
          styles.playScriptMenuItem,
          styles.playScriptMenuItemSearch,
        ])}
      ></a>
      <a
        className={classNames([
          styles.playScriptMenuItem,
          styles.playScriptMenuItemRecordings,
        ])}
      ></a>
      <a
        className={classNames([
          styles.playScriptMenuItem,
          styles.playScriptMenuItemHideHeader,
        ])}
      ></a>
    </nav>
  );
}

export default BlockingTabMenu;
