import type { PropsWithChildren, RefObject } from 'react';
import Icon, { type IconValue } from './icon.component';
import styles from './button.module.css';
import classNames from 'classnames';

export interface ButtonProps {
  icon?: IconValue;
  onClick?: () => void;
  disabled?: boolean;
  customClassNames?: string[];
  iconCustomClassNames?: string[];
  variant?: 'standout' | 'normal' | 'discrete';
  ref?: RefObject<HTMLButtonElement | null>;
  autoFocus?: boolean;
}

function Button(props: PropsWithChildren<ButtonProps>) {
  const variant = props.variant ?? 'normal';
  return (
    <button
      autoFocus={props.autoFocus}
      ref={props.ref}
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
          customClassNames={[styles.icon].concat(
            props.iconCustomClassNames ?? [],
          )}
        />
      ) : null}
      {props.children}
    </button>
  );
}

export default Button;
