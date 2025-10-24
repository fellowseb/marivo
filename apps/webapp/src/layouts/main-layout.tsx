import type { PropsWithChildren, ReactNode } from 'react';
import { Outlet } from 'react-router';
import Header from './header.component';
import styles from './main-layout.module.css';

interface MainLayoutBaseProps {
  breadcrumbs: ReactNode;
  Menu?: ReactNode;
  Toolbar?: ReactNode;
}

export function MainLayoutBase(props: PropsWithChildren<MainLayoutBaseProps>) {
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
        {props.children}
      </main>
    </div>
  );
}

type MainLayoutProps = MainLayoutBaseProps;

function MainLayout(props: MainLayoutProps) {
  return (
    <MainLayoutBase {...props}>
      <Outlet />
    </MainLayoutBase>
  );
}

export default MainLayout;
