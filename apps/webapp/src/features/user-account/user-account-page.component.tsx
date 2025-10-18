import { NavLink, useLocation, useNavigate } from 'react-router';
import Tabs from '../../components/tabs.component';
import styles from './user-account-page.module.css';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import { UserProfile } from '@clerk/react-router';

export function UserAccountPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="my-account"
      crumbs={[
        <NavLink
          to={{
            pathname: '/my-account',
          }}
        >
          My account
        </NavLink>,
      ]}
    />
  );
}

const HASHES = ['#general'];

export function UserAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const handleTabChange = (tabIndex: number) => {
    navigate({
      hash: HASHES[tabIndex],
    });
  };
  const hashIndex = HASHES.findIndex((hash) => hash === location.hash);
  const activeTab = hashIndex >= 0 ? hashIndex : undefined;
  return (
    <div className={styles.container}>
      <UserProfile
        routing="virtual"
        appearance={{
          theme: 'simple',
          variables: {
            colorBackground: '#ece2cc',
          },
        }}
      />
    </div>
  );
}

export default UserAccountPage;
