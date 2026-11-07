import { useTranslation } from "react-i18next";
import Tabs from "../../components/tabs.component";
import styles from "./staging-directions-tab.module.css";

function StagingDirectionsTab() {
  const { t } = useTranslation("settings");
  return (
    <div className={styles.container}>
      <Tabs
        containerClass={styles.tabs}
        tabs={[
          {
            name: t("staging.characters"),
            ContentComponent: <div>CharactersList</div>,
          },
          {
            name: t("staging.props"),
            ContentComponent: <div>PropsList</div>,
          },
          {
            name: t("staging.costumes"),
            ContentComponent: <div>CostumesList</div>,
          },
          {
            name: t("staging.lights"),
            ContentComponent: <div>LightsList</div>,
          },
          {
            name: t("staging.sounds"),
            ContentComponent: <div>SoundsList</div>,
          },
        ]}
      />
    </div>
  );
}

export default StagingDirectionsTab;
