import classNames from 'classnames';
import styles from './script-tab-menu.module.css';

function ScriptTabMenu() {
  return (
    <nav className={styles.playScriptMenu}>
      <a className={styles.playScriptMenuItem}>
        <div
          className={classNames([
            styles.playScriptMenuItemUndo,
            styles.toolbarIcon,
          ])}
        />
        undo
      </a>
      <a className={styles.playScriptMenuItem}>
        <div
          className={classNames([
            styles.playScriptMenuItemRedo,
            styles.toolbarIcon,
          ])}
        />
        redo
      </a>
      <a className={classNames([styles.playScriptMenuItem])}>
        <div
          className={classNames([
            styles.toolbarIcon,
            styles.playScriptMenuItemSearch,
          ])}
        />
        search
      </a>
      <a className={classNames([styles.playScriptMenuItem])}>
        <div
          className={classNames([
            styles.toolbarIcon,
            styles.playScriptMenuItemRecordings,
          ])}
        />
        voice command
      </a>
      <a className={classNames([styles.playScriptMenuItem])}>
        <div
          className={classNames([
            styles.toolbarIcon,
            styles.playScriptMenuItemHideHeader,
          ])}
        />
        hide
      </a>
    </nav>
  );
}

export default ScriptTabMenu;
