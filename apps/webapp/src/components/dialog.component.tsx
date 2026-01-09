import { type PropsWithChildren, type ReactNode } from 'react';
import styles from './dialog.module.css';

interface DialogProps {
  title: string;
  actions: ReactNode;
}

export function Dialog(props: PropsWithChildren<DialogProps>) {
  return (
    <dialog className={styles.dialog} open={true}>
      <h2 className={styles.title}>{props.title}</h2>
      {props.children}
      {props.actions}
    </dialog>
  );
}
