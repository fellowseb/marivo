import { NavLink } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";
import { OngoingImportsSection } from "./ongoing-imports-section.component";
import styles from "./new-play-page.module.css";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import Flex from "../../components/flex.component";

export function NewPlayPageBreadcrumbs() {
  const { t } = useTranslation("layout");
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: "/plays/new",
          }}
        >
          {t("newPlay")}
        </NavLink>,
      ]}
    />
  );
}

export function NewPlayPage() {
  const { t } = useTranslation("newPlay");
  const { count } = useCollectionMetadataContext();
  return (
    <FlowStep title={t("title")}>
      <Flex direction="column" grow={1} justify="stretch" align="stretch">
        {t("intro")}
        <Flex className={styles.section} direction="column" grow={1} align="stretch" gap={10}>
          <NavLink
            to={{
              pathname: "import",
            }}
            className={styles.desc}
          >
            {t("import.title")}
          </NavLink>
          <div className={styles.subdesc}>{t("import.subtitle")}</div>
          <OngoingImportsSection />
        </Flex>
        <Flex
          className={styles.section}
          direction="column"
          grow={1}
          justify="center"
          align="stretch"
        >
          <NavLink
            className={styles.desc}
            to={{
              pathname: "from-collection",
            }}
          >
            <Trans
              i18nKey="newPlay:collection.title"
              count={count}
              components={{ strong: <strong /> }}
            />
          </NavLink>
          <div className={styles.subdesc}>
            {t("collection.subtitle.line1")}
            <br />
            {t("collection.subtitle.line2")}
            <br />
            {t("collection.subtitle.line3")}
          </div>
        </Flex>
        <Flex
          className={styles.section}
          direction="column"
          grow={1}
          justify="center"
          align="stretch"
        >
          <NavLink
            className={styles.desc}
            to={{
              pathname: "empty",
            }}
          >
            {t("empty.title")}
          </NavLink>
          <div className={styles.subdesc}>{t("empty.subtitle")}</div>
        </Flex>
      </Flex>
    </FlowStep>
  );
}

export default NewPlayPage;
