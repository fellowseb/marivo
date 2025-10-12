import { Outlet } from 'react-router';
import styles from './auth-layout.module.css';

function AuthLayout() {
  return (
    <div className={styles.authlayoutContainer}>
      <div className={styles.container}>
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
