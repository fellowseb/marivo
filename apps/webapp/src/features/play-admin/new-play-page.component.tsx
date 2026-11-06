import { NavLink } from "react-router";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import FlowStep from "../../components/flow-step.component";
import { OngoingImportsSection } from "./ongoing-imports-section.component";
import styles from "./new-play-page.module.css";
import { useCollectionMetadataContext } from "./collection-metadata.context";
import Flex from "../../components/flex.component";

export function NewPlayPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: "/plays/new",
          }}
        >
          New play
        </NavLink>,
      ]}
    />
  );
}

export function NewPlayPage() {
  const { count } = useCollectionMetadataContext();
  return (
    <FlowStep title="Create a new play project">
      <Flex direction="column" grow={1} justify="stretch" align="stretch">
        How do you want to initialize the script ?
        <Flex className={styles.section} direction="column" grow={1} align="stretch" gap={10}>
          <NavLink
            to={{
              pathname: "import",
            }}
            className={styles.desc}
          >
            Import script from an external source
          </NavLink>
          <div className={styles.subdesc}>Supported file formats: PDF, TXT.</div>
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
            Pick from a collection of <strong>{count} scripts</strong> in the Public Domain.
          </NavLink>
          <div className={styles.subdesc}>
            A large selection of the most famous playwrights for FREE !
            <br />
            Available languages: French and English. (Soon: Spanish, German)
            <br />
            You'll be able to modify the script once the project created.
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
            Start with an empty script
          </NavLink>
          <div className={styles.subdesc}>Ideal for playwrights !</div>
        </Flex>
      </Flex>
    </FlowStep>
  );
}

export default NewPlayPage;
