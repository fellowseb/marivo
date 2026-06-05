import classNames from 'classnames';
import styles from './general-settings.module.css';
import Button from '../../components/button.component';
import { usePlayContext } from '../play-admin/play.context';
import { useState } from 'react';
import DeletePlayDialog from './delete-play-dialog.component';

function GeneralSettings() {
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const playDetails = usePlayContext();
  const ready = playDetails?.isOk();
  const playTitle = ready ? playDetails.dataOrThrow().details.title : '';
  const playUri = ready ? playDetails.dataOrThrow().details.uri : '';

  const handleDelete = () => {
    setShowDeleteConfirmDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDeleteConfirmDialog(false);
  };

  return ready ? (
    <>
      <div className={styles.container}>
        <div className={styles.line}>
          <label>Play Title</label>
          <input
            type="text"
            value={playDetails.dataOrThrow().details.title}
            size={40}
          />
        </div>
        <div className={styles.line}>
          <label>Creation Date</label>
          <span>
            {playDetails.dataOrThrow().details.createdDate.toLocaleString()}
          </span>
        </div>
        <div className={styles.line}>
          <label>Last Modification Date</label>
          <span>
            {playDetails.dataOrThrow().details.lastModifiedDate.toLocaleString()}
          </span>
        </div>
        <div className={styles.line}>
          <label>Archive the project</label>
          <Button icon="archive">Archive</Button>
        </div>
        <div className={classNames([styles.section, styles.sectionDanger])}>
          <div className={classNames([styles.sectionTitle])}>Danger zone</div>
          <div className={styles.line}>
            <label>Delete the project</label>
            <Button icon="delete" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>
      {showDeleteConfirmDialog && playUri && (
        <div className={styles.modalContainer}>
          <DeletePlayDialog
            playTitle={playTitle}
            playUri={playUri}
            onClose={handleCloseDialog}
          />
        </div>
      )}
    </>
  ) : null;
}

export default GeneralSettings;
