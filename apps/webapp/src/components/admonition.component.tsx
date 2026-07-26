import type { PropsWithChildren } from 'react';
import styles from './admonition.module.css';
import classNames from 'classnames';
import Icon from './icon.component';

interface AdmonitionProps {
  type: 'info';
  title?: string;
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
      <div>
        {props.title ? <div className={styles.title}>{props.title}</div> : null}
        {props.children}
      </div>
    </p>
  );
}

export default Admonition;
