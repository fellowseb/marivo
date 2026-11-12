import { useLayoutEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
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
    <NavLink to={props.path} relative="path" className={styles.tab}>
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
  const containerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  // subscribe to the location: the menubar itself may not re-render on
  // navigation (stable route element), so the effect must depend on it
  const location = useLocation();

  // position the sliding highlight under the active tab (NavLink sets
  // aria-current="page"); re-measure on navigation and on any resize so
  // the pill animates via its CSS transition when the active tab changes
  useLayoutEffect(() => {
    const container = containerRef.current;
    const highlight = highlightRef.current;
    if (!container || !highlight) return;
    const measure = () => {
      const active = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (active) {
        highlight.style.transform = `translateX(${active.offsetLeft}px)`;
        highlight.style.width = `${active.offsetWidth}px`;
        highlight.style.opacity = "1";
      } else {
        highlight.style.opacity = "0";
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const link of container.querySelectorAll("a")) observer.observe(link);
    return () => observer.disconnect();
  }, [location, props.definition]);

  return (
    <nav ref={containerRef} className={styles.container}>
      <span ref={highlightRef} className={styles.highlight} aria-hidden="true" />
      {props.definition.items.map(({ icon, path, label, accessPermission }) => {
        if (accessPermission && (!permissions || !permissions[accessPermission])) {
          return null;
        }
        return <MenuBarItem key={path} icon={icon} path={path} label={label} />;
      })}
    </nav>
  );
}
