import classNames from 'classnames';
import { NavLink } from 'react-router';
import styles from './play-menu.module.css';

function PlayMenu() {
  return (
    <div className={styles.container}>
      <nav className={styles.playMenu}>
        <NavLink
          to="../script"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemScript]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemScriptIcon,
            ])}
          />
          script
        </NavLink>
        <NavLink
          to="../staging-directions"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemStagingDirections]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemStagingDirectionsIcon,
            ])}
          />
          staging directions
        </NavLink>
        <NavLink
          to="../blocking"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemBlocking]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemBlockingIcon,
            ])}
          />
          blocking
        </NavLink>
        <NavLink
          to="../memorize"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemMemorize]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemMemorizeIcon,
            ])}
          />
          memorize
        </NavLink>
        <NavLink
          to="../planning"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemPlanning]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemPlanningIcon,
            ])}
          />
          planning
        </NavLink>
        <NavLink
          to="../settings"
          relative="path"
          className={({ isActive }) =>
            classNames({
              [styles.playMenuItem]: true,
              [styles.playMenuItemSettings]: true,
              [styles.playMenuItemActive]: isActive,
            })
          }
        >
          <div
            className={classNames([
              styles.playMenuItemIcon,
              styles.playMenuItemSettingsIcon,
            ])}
          />
          settings
        </NavLink>
      </nav>
      <div className={styles.menuIndicator}></div>
    </div>
  );
}

export default PlayMenu;
