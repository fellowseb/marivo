import styles from './plays-page.module.css';
import PlaysFilters, { type FilterValues } from './plays-filters.component';
import PlayList, {
  PlayInvites,
  type ParticipationInvite,
} from './plays-list.component';
import { useEffect, useState } from 'react';
import type { PlayListItemModel } from './plays.models';
import { useAuth } from '@clerk/clerk-react';

export function PlaysPageTitle() {
  return 'My Plays';
}

interface P {
  uri: string;
  createdDate: string;
  lastModifiedDate?: string;
  title: string;
  isOwner: boolean;
}

function map(play: P): PlayListItemModel {
  return {
    uri: play.uri,
    createdDate: new Date(play.createdDate),
    title: play.title,
    isOwner: play.isOwner,
    ...(play.lastModifiedDate
      ? { lastModifiedDate: new Date(play.lastModifiedDate) }
      : {}),
  };
}

function filterPlays(plays: PlayListItemModel[], filters: FilterValues) {
  return plays
    .filter((play) => {
      if (
        filters.title &&
        play.title.toLowerCase().indexOf(filters.title) < 0
      ) {
        return false;
      }
      if (filters.onlyPlaysSelfOwns && !play.isOwner) {
        return false;
      }
      return true;
    })
    .sort((lhs, rhs) => {
      if (!filters.orderBy) {
        return 0;
      }
      switch (filters.orderBy) {
        case 'orderByTitleAsc':
          return rhs.title.localeCompare(lhs.title);
        case 'orderByTitleDesc':
          return lhs.title.localeCompare(rhs.title);
        case 'orderByCreationDateAsc':
          return rhs.createdDate.getTime() - lhs.createdDate.getTime();
        case 'orderByCreationDateDesc':
          return lhs.createdDate.getTime() - rhs.createdDate.getTime();
        case 'orderByLastModificationDateAsc':
          return (
            (rhs.lastModifiedDate?.getTime() ?? 0) -
            (lhs.lastModifiedDate?.getTime() ?? 0)
          );
        case 'orderByLastModificationDateDesc':
          return (
            (lhs.lastModifiedDate?.getTime() ?? 0) -
            (rhs.lastModifiedDate?.getTime() ?? 0)
          );
        default:
          return 0;
      }
    });
}

function PlaysPage() {
  const [plays, setPlays] = useState<PlayListItemModel[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const { getToken } = useAuth();
  useEffect(() => {
    const refresh = async () => {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/plays', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-marivo-request-id': '10aa1304-316f-46b0-9c58-d415ffcfc2bc',
        },
      });
      const { data } = await response.json();
      setPlays(data.plays.map(map));
    };
    refresh();
  }, []);

  const invites: ParticipationInvite[] = [];

  // const invites = [
  //   {
  //     id: '1',
  //     title: 'La Noce des petits bourgeois',
  //     owner: 'Olivier Peigné',
  //   },
  //   {
  //     id: '2',
  //     title: 'Huit femmes',
  //     owner: 'Arnaud Alain',
  //   },
  // ];

  const handleFiltersChange = (filters: FilterValues) => {
    setFilters(filters);
  };

  const filteredPlays = filterPlays(plays, filters);
  return (
    <>
      <PlayInvites invites={invites} />
      <PlaysFilters onFiltersChange={handleFiltersChange} />
      <PlayList plays={filteredPlays} />
      <div className={styles.playListActions}>
        <button>+ Create new play</button>
      </div>
    </>
  );
}

export default PlaysPage;
