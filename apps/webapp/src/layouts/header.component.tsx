import { Fragment, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import styles from './header.module.css';
import { useAuth, useUser } from '@clerk/clerk-react';
import Button from '../components/button.components';
import Icon from '../components/icon.component';

interface HeaderBreadcrumbsProps {
  crumbs: ReactNode[];
}

export function HeaderBreadcrumbs(props: HeaderBreadcrumbsProps) {
  return (
    <>
      {props.crumbs.map((node, idx) => {
        const arrow = <div className={styles.breadcrumbArrow}>▶ </div>;
        return (
          <Fragment key={idx}>
            {arrow}
            {node}
          </Fragment>
        );
      })}
    </>
  );
}

interface HeaderProps {
  pageBreadcrumbs: ReactNode;
  Menu?: ReactNode;
  Toolbar?: ReactNode;
}

function Header(props: HeaderProps) {
  const user = useUser();
  const auth = useAuth();
  const navigate = useNavigate();
  const handleSignout = async () => {
    await auth.signOut();
    navigate('/');
  };
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logoContainer}>
          <NavLink to="/plays" className={styles.logo} />
        </div>
        <div className={styles.breadcrumbs}>{props.pageBreadcrumbs}</div>
        <NavLink className={styles.user} to="/my-account">
          <Icon value="user" mode="primary" size="medium" />
          {user.user?.username ?? ''}
        </NavLink>
        <div className={styles.userActionsMenu}>
          <Button icon="help" />
          <Button icon="notification">0</Button>
          <Button icon="signout" onClick={handleSignout}>
            Sign out
          </Button>
        </div>
      </div>
      {props.Menu ? (
        <div className={styles.mainMenu}>
          {props.Menu}
          {props.Toolbar ? (
            <div className={styles.pageMenu}>{props.Toolbar}</div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export default Header;
