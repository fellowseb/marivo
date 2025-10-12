import classNames from 'classnames';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import styles from './header.module.css';
import { SignOutButton, useUser } from '@clerk/clerk-react';

interface HeaderProps {
  pageTitle: ReactNode;
  Menu?: ReactNode;
  PageMenu?: ReactNode;
}

function Header(props: HeaderProps) {
  const user = useUser();
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logoContainer}>
          <NavLink to="/" className={styles.logo} />
        </div>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>{props.pageTitle}</h1>
          {props.Menu}
        </div>
        <div className={styles.userContainer}>
          <Link className={styles.user} to="/user-settings">
            <div
              className={classNames([
                styles.userAction,
                styles.userActionSettings,
              ])}
            ></div>
            {user.user?.fullName ?? ''}
          </Link>
          <div className={styles.userActionsMenu}>
            <a
              className={classNames([
                styles.userAction,
                styles.userActionNotifications,
              ])}
            ></a>
            <a
              className={classNames([styles.userAction, styles.userActionHelp])}
            ></a>
            <a
              className={classNames([
                styles.userAction,
                styles.userActionLogout,
              ])}
            ></a>
            <SignOutButton component="a" />
          </div>
        </div>
      </div>
      <div className={styles.pageMenu}>{props.PageMenu}</div>
    </header>
  );
}

export default Header;
