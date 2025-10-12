import Tabs from '../../components/tabs.component';
import AvailabilitiesPlanning from './availabilities-planning.component';
import MeetingsPlanning from './meetings-planning.component';
import styles from './planning-tab.module.css';

function PlanningTab() {
  return (
    <div className={styles.container}>
      <Tabs
        containerClass={styles.tabs}
        tabs={[
          {
            name: 'Rehearsals / Meetings',
            ContentComponent: <MeetingsPlanning />,
          },
          {
            name: 'Availabilities',
            ContentComponent: <AvailabilitiesPlanning />,
          },
        ]}
      />
    </div>
  );
}

export default PlanningTab;
