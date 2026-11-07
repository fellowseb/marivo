import styles from "./plays-page.module.css";
import PlayList from "./plays-list.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Button from "../../components/button.component";

export function PlaysPageBreadcrumbs() {
  const { t } = useTranslation("layout");
  return <HeaderBreadcrumbs crumbs={[t("myPlays")]} />;
}

function PlaysPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("plays");

  const handleCreateNewPlay = () => {
    navigate({
      pathname: "new",
    });
  };

  return (
    <div className={styles.container}>
      <PlayList />
      <div className={styles.playListActions}>
        <Button onClick={handleCreateNewPlay} icon="new">
          {t("createNewPlay")}
        </Button>
      </div>
    </div>
  );
}

export default PlaysPage;
