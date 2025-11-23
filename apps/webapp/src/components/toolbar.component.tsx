import styles from './toolbar.module.css';
import type { IconValue } from './icon.component';
import Icon from './icon.component';
import classNames from 'classnames';

interface ToolbarItemProps {
  label: string;
  icon: IconValue;
  disabled: boolean;
  // tooltip: string; // TODO
  onAction: () => void;
}

function ToolbarItem(props: ToolbarItemProps) {
  return (
    <button
      className={classNames({
        [styles.item]: true,
        [styles.disabled]: !!props.disabled,
      })}
      disabled={props.disabled}
      onClick={props.onAction}
    >
      <div className={styles.iconContainer}>
        <Icon
          size="small"
          mode={props.disabled ? 'disabled' : 'primary'}
          value={props.icon}
        />
      </div>
      <span className={styles.label}>{props.label}</span>
    </button>
  );
}

export interface ToolbarDefinition {
  items: {
    id: string;
    label: string;
    icon: IconValue;
    disabled: boolean;
    onAction: () => void;
  }[];
}

export interface ToolbarProps {
  definition: ToolbarDefinition;
}

function Toolbar(props: ToolbarProps) {
  return (
    <div className={styles.container}>
      {props.definition.items.map(({ id, label, icon, disabled, onAction }) => (
        <ToolbarItem
          key={id}
          label={label}
          icon={icon}
          disabled={disabled}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

export default Toolbar;
