import type { PropsWithChildren, ReactNode } from 'react';
import styles from './flow-step.module.css';

interface FlowStepProps {
  title: string;
  Actions?: ReactNode;
  growVertically?: boolean;
}

function FlowStep(props: PropsWithChildren<FlowStepProps>) {
  return (
    <div className={styles.outerContainer}>
      <h3 className={styles.title}>{props.title}</h3>
      <div
        className={styles.container}
        style={{
          flex: props.growVertically ? '1' : '0',
        }}
      >
        {props.children}
      </div>
      {props.Actions ? (
        <div className={styles.actions}>{props.Actions}</div>
      ) : null}
    </div>
  );
}

export default FlowStep;
