import type { PropsWithChildren } from 'react';
import Icon, { type IconValue } from './icon.component';
import styles from './button.module.css';
import classNames from 'classnames';

export interface ButtonProps {
  icon?: IconValue;
  onClick?: () => void;
  disabled?: boolean;
  customClassNames?: string[];
}

function Button(props: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={classNames(
        [styles.button].concat(props.customClassNames ?? []),
      )}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.icon ? (
        <Icon
          value={props.icon}
          size="medium"
          mode="secondary"
          customClassNames={[styles.icon]}
        />
      ) : null}
      {props.children}
    </button>
  );
}

export default Button;
