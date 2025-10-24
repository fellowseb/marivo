import styles from './dots-loader.module.css';

function DotsLoader() {
  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
    </div>
  );
}

export default DotsLoader;
