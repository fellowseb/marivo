import {
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import styles from './dialog.module.css';
import classNames from 'classnames';

interface DialogProps {
  title?: string;
  actions: ReactNode;
  onKeyUp?: KeyboardEventHandler;
  customClassNames?: string[];
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
      {props.title ? <h2 className={styles.title}>{props.title}</h2> : null}
      {props.children}
      {props.actions}
    </dialog>
  );
}
