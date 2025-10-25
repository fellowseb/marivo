import styles from './plays-page.module.css';
import PlayList from './plays-list.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import { useNavigate } from 'react-router';
import Button from '../../components/button.components';

export function PlaysPageBreadcrumbs() {
  return <HeaderBreadcrumbs crumbs={['My plays']} />;
}

function PlaysPage() {
  const navigate = useNavigate();

  const handleCreateNewPlay = () => {
    navigate({
      pathname: 'new',
    });
  };

  return (
    <div className={styles.container}>
      <PlayList />
      <div className={styles.playListActions}>
        <Button onClick={handleCreateNewPlay} icon="new">
          Create new play
        </Button>
      </div>
    </div>
  );
}

export default PlaysPage;
