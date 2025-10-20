import { NavLink } from 'react-router';
import styles from './new-play-page.module.css';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import Button from '../../components/button.components';
import { createContext, useContext, useMemo } from 'react';

export function NewPlayPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays',
          }}
        >
          My plays
        </NavLink>,
        'New',
      ]}
    />
  );
}

export function NewPlayPage() {
  return (
    <div className={styles.container}>
      <form>
        <label>
          Title: <input type="text" />
        </label>
        <label>
          <input name="origin" type="radio" /> Use Marivo has the main script
          editor
        </label>
        <p>
          Enjoy collaborating in a minimalistic editing environment with all the
          features needed:
          <ul>
            <li>
              controlled format for title / sections / line authors /
              didascalies
            </li>
            <li>full undo/redo history</li>
            <li>version control of lines</li>
            <li>capability to attach comments/staging directions</li>
            <li>share draft versions to let the Staging Director validate</li>
          </ul>
        </p>
        <label>
          <input name="origin" type="radio" /> Import script from external
          source: <input type="text" />
        </label>
        <Button icon="new">Create</Button>
      </form>
    </div>
  );
}

export default NewPlayPage;
