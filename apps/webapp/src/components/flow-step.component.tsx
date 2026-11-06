import type { PropsWithChildren, ReactNode } from "react";
import Container from "./container.component";
import styles from "./flow-step.module.css";

interface FlowStepProps {
  title: string | ReactNode;
  Actions?: ReactNode;
  growVertically?: boolean;
}

function FlowStep(props: PropsWithChildren<FlowStepProps>) {
  return (
    <div className={styles.outerContainer}>
      <h3 className={styles.title}>{props.title}</h3>
      <Container
        className={styles.container}
        style={{
          flex: props.growVertically ? "1" : "0",
        }}
      >
        {props.children}
      </Container>
      {props.Actions ? <div className={styles.actions}>{props.Actions}</div> : null}
    </div>
  );
}

export default FlowStep;
