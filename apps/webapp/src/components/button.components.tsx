import type { PropsWithChildren } from 'react';
import Icon, { type IconValue } from './icon.component';
import styles from './button.module.css';

export interface ButtonProps {
  icon?: IconValue;
  onClick?: () => void;
}

function Button(props: PropsWithChildren<ButtonProps>) {
  return (
    <button className={styles.button} onClick={props.onClick}>
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
