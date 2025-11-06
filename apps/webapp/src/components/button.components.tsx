import type { PropsWithChildren } from 'react';
import Icon, { type IconValue } from './icon.component';
import styles from './button.module.css';
import classNames from 'classnames';

export interface ButtonProps {
  icon?: IconValue;
  onClick?: () => void;
  disabled?: boolean;
  customClassNames?: string[];
  variant?: 'standout' | 'normal' | 'discrete';
}

function Button(props: PropsWithChildren<ButtonProps>) {
  const variant = props.variant ?? 'normal';
  return (
    <button
      className={classNames({
        [styles.normal]: variant === 'normal',
        [styles.discrete]: variant === 'discrete',
        [styles.button]: true,
        ...(props.customClassNames ?? []).reduce(
          (acc, cls) => ({
            ...acc,
            [cls]: true,
          }),
          {},
        ),
      })}
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
