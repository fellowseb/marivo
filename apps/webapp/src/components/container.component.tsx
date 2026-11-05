import classNames from "classnames";
import type { PropsWithChildren } from "react";
import styles from "./container.module.css";

interface ContainerProps {
  className?: string;
}

/** Generic bordered, rounded box. Layout/background go in the optional className. */
function Container(props: PropsWithChildren<ContainerProps>) {
  return <div className={classNames(styles.container, props.className)}>{props.children}</div>;
}

export default Container;
