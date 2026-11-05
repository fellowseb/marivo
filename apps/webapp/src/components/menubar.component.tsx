import classNames from "classnames";
import { NavLink } from "react-router";
import styles from "./menubar.module.css";
import type { IconValue } from "./icon.component";
import Icon from "./icon.component";
import type { AppRouterOutput } from "@marivo/api";
import { usePlayContext } from "../features/play-admin/play.context";

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
    /** Play permission required to show the item; omit for non-play pages (always shown). */
    accessPermission?: keyof AppRouterOutput["plays"]["playDetails"]["permissions"];
  }[];
}

export interface MenuBarProps {
  definition: MenuBarDefinition;
}

export function MenuBar(props: MenuBarProps) {
  const playContext = usePlayContext();
  const permissions = playContext?.isOk() ? playContext.dataOrThrow().permissions : undefined;
  return (
    <nav className={styles.container}>
      {props.definition.items.map(({ icon, path, label, accessPermission }) => {
        if (accessPermission && (!permissions || !permissions[accessPermission])) {
          return null;
        }
        return <MenuBarItem key={path} icon={icon} path={path} label={label} />;
      })}
    </nav>
  );
}
