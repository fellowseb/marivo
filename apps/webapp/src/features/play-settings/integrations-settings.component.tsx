import { useTranslation } from "react-i18next";
import classNames from "classnames";
import styles from "./general-settings.module.css";

function IntegrationsSettings() {
  const { t } = useTranslation("settings");
  return (
    <div className={styles.container}>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>Notifications</div>
        <div className={styles.line}>
          <label>{t("integrations.notifyWhatsapp")}</label>
          <input type="checkbox" />
          <input type="text" size={36} defaultValue="WhatsApp Group ID" disabled={true} />
        </div>
        <div className={styles.line}>
          <label>{t("integrations.scriptUpdates")}</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>Director's notebook updates</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>{t("integrations.blockingUpdates")}</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>{t("integrations.planningUpdates")}</label>
          <input type="checkbox" />
        </div>
        <div className={styles.line}>
          <label>{t("integrations.planningReminders")}</label>
          <input type="checkbox" />
        </div>
      </div>
    </div>
  );
}

export default IntegrationsSettings;
