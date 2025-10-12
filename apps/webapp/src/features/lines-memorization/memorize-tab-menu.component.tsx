import classNames from 'classnames';
import styles from './memorize-tab-menu.module.css';

function MemorizeTabMenu() {
  return (
    <>
      <nav className={styles.playScriptMenu}>
        <a
          className={classNames([
            styles.playScriptMenuItem,
            styles.playScriptMenuItemSearch,
          ])}
        ></a>
        <a
          className={classNames([
            styles.playScriptMenuItem,
            styles.playScriptMenuItemHideHeader,
          ])}
        ></a>
      </nav>
    </>
  );
}

export default MemorizeTabMenu;
