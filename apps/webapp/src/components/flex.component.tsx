import classNames from "classnames";
import type { CSSProperties, PropsWithChildren } from "react";
import styles from "./flex.module.css";

interface FlexProps {
  direction?: CSSProperties["flexDirection"];
  gap?: CSSProperties["gap"];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  grow?: CSSProperties["flexGrow"];
  shrink?: CSSProperties["flexShrink"];
  wrap?: CSSProperties["flexWrap"];
  className?: string;
  style?: CSSProperties;
}

/** Generic flexbox div: `display: flex` plus optional layout props. */
function Flex(props: PropsWithChildren<FlexProps>) {
  const { children, className, style, ...layout } = props;
  return (
    <div
      className={classNames(styles.flex, className)}
      style={{
        flexDirection: layout.direction,
        gap: layout.gap,
        alignItems: layout.align,
        justifyContent: layout.justify,
        flexGrow: layout.grow,
        flexShrink: layout.shrink,
        flexWrap: layout.wrap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Flex;
