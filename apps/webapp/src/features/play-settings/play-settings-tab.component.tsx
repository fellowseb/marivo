import { useLocation, useNavigate } from 'react-router';
import Tabs from '../../components/tabs.component';
import GeneralSettings from './general-settings.component';
import IntegrationsSettings from './integrations-settings.component';
import ParticipantsSettings from './participants-settings.component';
import styles from './play-settings-tab.module.css';

const HASHES = ['#general', '#participants', '#integrations'];

function PlaySettingsTab() {
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
      <Tabs
        onTabChange={handleTabChange}
        containerClass={styles.tabs}
        activeTab={activeTab}
        tabs={[
          {
            name: 'General',
            ContentComponent: <GeneralSettings />,
          },
          {
            name: 'Participants & Permissions',
            ContentComponent: <ParticipantsSettings />,
          },
          {
            name: 'Integrations',
            ContentComponent: <IntegrationsSettings />,
          },
        ]}
      />
    </div>
  );
}

export default PlaySettingsTab;
