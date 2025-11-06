import styles from './toolbar.module.css';
import type { IconValue } from './icon.component';
import Icon from './icon.component';
import classNames from 'classnames';

interface ToolbarItemProps {
  label: string;
  icon: IconValue;
  disabled?: boolean;
}

function ToolbarItem(props: ToolbarItemProps) {
  return (
    <button
      className={classNames({
        [styles.item]: true,
        [styles.disabled]: !!props.disabled,
      })}
    >
      <div className={styles.iconContainer}>
        <Icon size="small" mode="primary" value={props.icon} />
      </div>
      <span className={styles.label}>{props.label}</span>
    </button>
  );
}

export interface ToolbarDefinition {
  items: {
    label: string;
    icon: IconValue;
  }[];
}

export interface ToolbarProps {
  definition: ToolbarDefinition;
}

function Toolbar(props: ToolbarProps) {
  return (
    <div className={styles.container}>
      {props.definition.items.map(({ label, icon }, idx) => (
        <ToolbarItem key={idx} label={label} icon={icon} />
      ))}
    </div>
  );
}

export default Toolbar;
