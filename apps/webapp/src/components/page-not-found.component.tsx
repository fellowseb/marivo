import { Trans, useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import styles from "./page-not-found.module.css";

function PageNotFound() {
  useTranslation("errors");
  return (
    <div className={styles.container}>
      <img src="/src/assets/marivo-app-logo-full-transparent.webp" width={250} />
      <div className={styles.desc}>
        <Trans
          i18nKey="errors:notFound.body"
          components={{
            br: <br />,
            contact: <a href="https://marivo.app/contact" />,
            plays: <NavLink to={{ pathname: "/plays" }} />,
          }}
        />
      </div>
    </div>
  );
}

export default PageNotFound;
