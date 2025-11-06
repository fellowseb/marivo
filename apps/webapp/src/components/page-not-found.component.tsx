import { NavLink } from 'react-router';
import styles from './page-not-found.module.css';

function PageNotFound() {
  return (
    <div className={styles.container}>
      <img
        src="/src/assets/marivo-app-logo-full-transparent.webp"
        width={250}
      />
      <div className={styles.desc}>
        The page or resource you requested doesn't seem to exist !<br />
        You may want to click <a href="https://marivo.app/contact">here</a> to
        contact us or
        <br /> click{' '}
        <NavLink
          to={{
            pathname: '/plays',
          }}
        >
          here
        </NavLink>{' '}
        to get back to your plays list.
      </div>
    </div>
  );
}

export default PageNotFound;
