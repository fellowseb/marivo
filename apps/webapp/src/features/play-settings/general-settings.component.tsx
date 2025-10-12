import classNames from 'classnames';
import styles from './general-settings.module.css';

function GeneralSettings() {
  return (
    <div className={styles.container}>
      <div className={styles.line}>
        <label>Play Title</label>
        <input type="text" value="The Mousetrap" size={40} />
      </div>
      <div className={styles.line}>
        <label>Creation Date</label>
        <span>{new Date().toLocaleString()}</span>
      </div>
      <div className={styles.line}>
        <label>Last Modification Date</label>
        <span>{new Date().toLocaleString()}</span>
      </div>
      <div className={styles.line}>
        <label>Archive the project</label>
        <button>Archive</button>
      </div>
      <div className={classNames([styles.section, styles.sectionDanger])}>
        <div className={classNames([styles.sectionTitle])}>Danger zone</div>
        <div className={styles.line}>
          <label>Delete the project</label>
          <button>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default GeneralSettings;
