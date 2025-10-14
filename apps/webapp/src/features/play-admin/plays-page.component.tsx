import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './plays-page.module.css';
import PlaysFilters from './plays-filters.component';
import PlayList, { PlayInvites } from './plays-list.component';
import { useTRPC } from '../../trpc';
import { filterSortPlays, type PlayFilterSortOptions } from './plays.lib';

export function PlaysPageTitle() {
  return 'My Plays';
}

function PlaysPage() {
  const [filters, setFilters] = useState<PlayFilterSortOptions>({});
  const trpc = useTRPC();
  const playsQuery = useQuery(trpc.plays.list.queryOptions());

  const invites = [
    {
      id: '1',
      title: 'La Noce des petits bourgeois',
      owner: 'Olivier Peigné',
    },
  ];

  const handleFiltersChange = (filters: PlayFilterSortOptions) => {
    setFilters(filters);
  };

  const filteredPlays = filterSortPlays(playsQuery.data?.plays ?? [], filters);
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
