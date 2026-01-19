import type { PropsWithChildren } from 'react';
import Button from './button.component';
import Icon, { type IconValue } from './icon.component';
import styles from './panel.module.css';

interface PanelProps {
  title: string;
  icon: IconValue;
  onClose?: () => void;
}

function Panel(props: PropsWithChildren<PanelProps>) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitleIcon}>
          <Icon value={props.icon} mode="primary" size="small" />
          {props.title}
        </div>
        <Button
          icon="close"
          variant="discrete"
          iconCustomClassNames={[styles.closeButton]}
          onClick={props.onClose}
        />
      </div>
      <div className={styles.content}>{props.children}</div>
    </div>
  );
}

export default Panel;
