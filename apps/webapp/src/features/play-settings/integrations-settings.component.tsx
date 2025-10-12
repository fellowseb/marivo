import classNames from 'classnames';
import styles from './general-settings.module.css';

function IntegrationsSettings() {
  return (
    <div className={styles.container}>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>Notifications</div>
        <div className={styles.line}>
          <label>Notify WhatsApp group</label>
          <input type="checkbox" />
          <input
            type="text"
            size={36}
            defaultValue="WhatsApp Group ID"
            disabled={true}
          />
        </div>
        <div className={styles.line}>
          <label>Script updates</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>Director's notebook updates</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>Blocking updates</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>Planning updates</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>Planning reminders</label>
          <input type="checkbox" />
        </div>
      </div>
    </div>
  );
}

export default IntegrationsSettings;
