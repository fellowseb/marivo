import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import Header from './header.component';
import styles from './main-layout.module.css';

interface MainLayoutProps {
  breadcrumbs: ReactNode;
  Menu?: ReactNode;
  Toolbar?: ReactNode;
}

function MainLayout(props: MainLayoutProps) {
  return (
    <div className={styles.mainContainer}>
      <Header
        pageBreadcrumbs={props.breadcrumbs}
        Menu={props.Menu}
        Toolbar={props.Toolbar}
      />
      <main
        className={styles.main}
        style={{
          marginTop: props.Menu ? '7.4rem' : '4rem',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
