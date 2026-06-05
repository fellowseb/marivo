import {
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import styles from './dialog.module.css';
import classNames from 'classnames';
import type { IconValue } from './icon.component';
import Icon from './icon.component';

interface DialogProps {
  title?: string;
  actions: ReactNode;
  onKeyUp?: KeyboardEventHandler;
  customClassNames?: string[];
  icon?: IconValue;
}

export function Dialog(props: PropsWithChildren<DialogProps>) {
  const handleBackgroundClick: MouseEventHandler = (event) => {
    event.stopPropagation();
  };
  return (
    <dialog
      className={classNames(
        [styles.dialog].concat(props.customClassNames ?? []),
      )}
      open={true}
      onKeyUp={props.onKeyUp}
      onClick={handleBackgroundClick}
    >
      <div className={styles.header}>
        {props.icon ? (
          <Icon mode="primary" size="large" value={props.icon} />
        ) : null}
        {props.title ? <h2 className={styles.title}>{props.title}</h2> : null}
      </div>
      {props.children}
      <div className={styles.actions}>{props.actions}</div>
    </dialog>
  );
}
