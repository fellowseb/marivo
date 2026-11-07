import { useTranslation } from "react-i18next";
import Button from "../../components/button.component";
import { Dialog } from "../../components/dialog.component";
import styles from "./memorize-commands.module.css";

function MemorizeCommands() {
  const { t } = useTranslation("settings");
  return (
    <Dialog
      title={t("memorize.title")}
      actions={<Button icon="accept">{t("memorize.start")}</Button>}
    >
      <div className={styles.playOptions}>
        <div className={styles.playOptionsLine}>
          <label>{t("memorize.character")}</label>
          <select>
            <option>LA MÈRE</option>
          </select>
        </div>
        <div className={styles.playOptionsLine}>
          <label>{t("memorize.parts")}</label>
          <select>
            <option>Whole Play</option>
            <option>Act I</option>
            <option>Act I - Scene 1</option>
          </select>
        </div>
        <div className={styles.playOptionsLine}>
          <label>{t("memorize.randomize")}</label>
          <input type="checkbox" />
        </div>
        <div className={styles.playOptionsLine}>
          <label>{t("memorize.onlyCueLines")}</label>
          <input type="checkbox" />
        </div>
        <div className={styles.playOptionsLine}>
          <label>{t("memorize.hideMyLines")}</label>
          <input type="checkbox" />
        </div>
      </div>
    </Dialog>
  );
}

export default MemorizeCommands;
