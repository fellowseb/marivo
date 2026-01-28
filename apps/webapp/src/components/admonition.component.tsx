import type { PropsWithChildren } from 'react';
import styles from './admonition.module.css';
import classNames from 'classnames';
import Icon from './icon.component';

interface AdmonitionProps {
  type: 'info';
}

function Admonition(props: PropsWithChildren<AdmonitionProps>) {
  return (
    <p
      className={classNames({
        [styles.admonition]: true,
        [styles.info]: props.type === 'info',
      })}
    >
      <Icon
        mode="primary"
        size="large"
        value="info"
        customClassNames={[styles.icon]}
      />
      {props.children}
    </p>
  );
}

export default Admonition;
