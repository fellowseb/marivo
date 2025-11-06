import classNames from 'classnames';
import styles from './dots-loader.module.css';

interface DotsLoaderProps {
  size?: 'small' | 'xlarge';
}

function DotsLoader(props: DotsLoaderProps) {
  const size = props.size ?? 'small';
  return (
    <div
      className={classNames({
        [styles.container]: true,
        [styles.containerSmall]: size === 'small',
        [styles.containerXLarge]: size === 'xlarge',
      })}
    >
      <div
        className={classNames({
          [styles.loader]: true,
          [styles.small]: size === 'small',
          [styles.xlarge]: size === 'xlarge',
        })}
      ></div>
    </div>
  );
}

export default DotsLoader;
