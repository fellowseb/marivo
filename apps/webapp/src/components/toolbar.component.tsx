import styles from './toolbar.module.css';
import type { IconValue } from './icon.component';
import Icon from './icon.component';

interface ToolbarItemProps {
  label: string;
  icon: IconValue;
}

function ToolbarItem(props: ToolbarItemProps) {
  return (
    <button className={styles.item}>
      <div className={styles.iconContainer}>
        <Icon size="small" mode="primary" value={props.icon} />
      </div>
      {props.label}
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
      {props.definition.items.map(({ label, icon }) => (
        <ToolbarItem label={label} icon={icon} />
      ))}
    </div>
  );
}

export default Toolbar;
