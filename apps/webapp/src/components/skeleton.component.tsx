import classNames from 'classnames';
import styles from './skeleton.module.css';

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={classNames([styles.lines, styles.wrapper])}>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div className={styles.image}></div>
    </div>
  );
}

export default Skeleton;
