import type { PropsWithChildren, ReactNode } from 'react';
import styles from './flow-step.module.css';
import Button from './button.component';

interface FlowStepProps {
  title: string;
  Actions?: ReactNode;
}

function FlowStep(props: PropsWithChildren<FlowStepProps>) {
  return (
    <div className={styles.outerContainer}>
      <h3 className={styles.title}>{props.title}</h3>
      <div className={styles.container}>{props.children}</div>
      {props.Actions ? (
        <div className={styles.actions}>{props.Actions}</div>
      ) : null}
    </div>
  );
}

export default FlowStep;
