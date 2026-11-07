import { useTranslation } from "react-i18next";
import classNames from "classnames";
import styles from "./participants-settings.module.css";

function ParticipantsSettings() {
  const { t } = useTranslation("settings");
  return (
    <div className={styles.container}>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>Participants</div>
        <div className={styles.line}></div>
      </div>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>Permissions</div>
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th></th>
              <th>{t("participants.owner")}</th>
              <th>
                Staging Director <button className={styles.deleteFunctionBtn} />
              </th>
              <th>
                Comedian <button className={styles.deleteFunctionBtn} />
              </th>
              <th>
                <button className={styles.addFunctionBtn}>Add function</button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.script")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>view</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>edit</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>make draft suggestions</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.stagingDirections")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>view</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>edit</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>annotate script</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.blocking")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>view</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>edit</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.memorize")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>access</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.planning")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>view</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>edit</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTableGroupRow}>
              <td colSpan={4}>{t("participants.settings")}</td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>view</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
            <tr className={styles.permissionsTablePermissionRow}>
              <td>edit</td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
              <td>
                <input type="checkbox" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ParticipantsSettings;
