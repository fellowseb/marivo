import { NavLink } from 'react-router';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';
import OngoingImportsNotification from './ongoing-imports-notification.component';
import styles from './new-play-page.module.css';

export function NewPlayPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New play
        </NavLink>,
      ]}
    />
  );
}

export function NewPlayPage() {
  return (
    <FlowStep title="Create a new play project">
      <OngoingImportsNotification />
      How do you want to initialize the script ?
      <NavLink
        className={styles.section}
        to={{
          pathname: 'import',
        }}
      >
        <div className={styles.desc}>Import script from an external source</div>
        <div className={styles.subdesc}>Supported file formats: PDF, TXT.</div>
      </NavLink>
      <NavLink
        className={styles.section}
        to={{
          pathname: 'from-collection',
        }}
      >
        <div className={styles.desc}>
          Pick from a collection of <strong>1542 scripts</strong> in the Public
          Domain.
        </div>
        <div className={styles.subdesc}>
          A large selection of the most famous playwrights for FREE !
          <br />
          Available languages: French and English. (Soon: Spanish, German)
          <br />
          You'll be able to modify the script once the project created.
        </div>
      </NavLink>
      <NavLink
        className={styles.section}
        to={{
          pathname: 'empty',
        }}
      >
        <div className={styles.desc}>Start with an empty script</div>
        <div className={styles.subdesc}>Ideal for playwrights !</div>
      </NavLink>
    </FlowStep>
  );
}

export default NewPlayPage;
