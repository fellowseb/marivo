import classNames from 'classnames';
import { NavLink } from 'react-router';
import styles from './menubar.module.css';
import type { IconValue } from './icon.component';
import Icon from './icon.component';

interface MenuBarItemProps {
  label: string;
  icon: IconValue;
  path: string;
}

function MenuBarItem(props: MenuBarItemProps) {
  return (
    <NavLink
      to={props.path}
      relative="path"
      className={({ isActive }) =>
        classNames({
          [styles.tab]: true,
          [styles.selected]: isActive,
        })
      }
    >
      <Icon value={props.icon} size="small" mode="primary" />
      {props.label}
    </NavLink>
  );
}

export interface MenuBarDefinition {
  items: {
    label: string;
    icon: IconValue;
    path: string;
  }[];
}

export interface MenuBarProps {
  definition: MenuBarDefinition;
}

export function MenuBar(props: MenuBarProps) {
  return (
    <nav className={styles.container}>
      {props.definition.items.map(({ icon, path, label }, idx) => (
        <MenuBarItem key={idx} icon={icon} path={path} label={label} />
      ))}
    </nav>
  );
}
