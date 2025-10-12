import Tabs from '../../components/tabs.component';
import styles from './staging-directions-tab.module.css';

function StagingDirectionsTab() {
  return (
    <div className={styles.container}>
      <Tabs
        containerClass={styles.tabs}
        tabs={[
          {
            name: 'Characters',
            ContentComponent: <div>CharactersList</div>,
          },
          {
            name: 'Props',
            ContentComponent: <div>PropsList</div>,
          },
          {
            name: 'Costumes',
            ContentComponent: <div>CostumesList</div>,
          },
          {
            name: 'Lights',
            ContentComponent: <div>LightsList</div>,
          },
          {
            name: 'Sounds',
            ContentComponent: <div>SoundsList</div>,
          },
        ]}
      />
    </div>
  );
}

export default StagingDirectionsTab;
