import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import styles from './plays-list.module.css';
import Skeleton from '../../components/skeleton.component';
import PlaysFilters from './plays-filters.component';
import { useState } from 'react';
import { filterSortPlays, type PlayFilterSortOptions } from './plays.lib';
import { PlayInvites } from './play-invites.component';
import UnexpectedError from '../../components/unexpected-error.component';
import DotsLoader from '../../components/dots-loader';

interface PlayListItemProps {
  id: string;
  title: string;
  ownerFullName?: string;
  ownerUsername?: string;
  isOwner: boolean;
  creationDate: Date;
  lastModifiedDate?: Date;
}

function PlayListItem(props: PlayListItemProps) {
  const ownerStr = props.isOwner
    ? 'You'
    : `${props.ownerFullName} (${props.ownerUsername})`;
  return (
    <li className={styles.play}>
      <NavLink
        replace
        to={{
          pathname: '/play/' + props.id,
        }}
      >
        <div className={styles.playDetails}>
          <span className={styles.playTitle}>{props.title}</span>
          <span>
            Owned by{' '}
            <span className={styles.playDetailsValues}>{ownerStr}</span>
          </span>

          <span>
            Créée le{' '}
            <span className={styles.playDetailsValues}>
              {props.creationDate.toLocaleString()}
            </span>
          </span>
          <span>
            Dernière modification le{' '}
            <span className={styles.playDetailsValues}>
              {props.lastModifiedDate
                ? props.lastModifiedDate.toLocaleString()
                : '—'}
            </span>
          </span>
        </div>
        <div className={styles.playPoster}>
          <div className={styles.playPosterOverlay}></div>
        </div>
      </NavLink>
    </li>
  );
}

function NoFilteredPlays() {
  return (
    <div className={styles.noPlaysContainer}>
      <p>Filters don't match any entry !</p>
    </div>
  );
}

function NoPlays() {
  return (
    <div className={styles.noPlaysContainer}>
      <p>You haven't joined any play yet !</p>
      <p>All invites you could receive should be displayed on this page.</p>
      <p>You can also create a new play yourself by using the button below.</p>
    </div>
  );
}

function PlayList() {
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.list.queryOptions());
  const [filters, setFilters] = useState<PlayFilterSortOptions>({});
  const handleFiltersChange = (filters: PlayFilterSortOptions) => {
    setFilters(filters);
  };
  const plays = query.data?.plays ?? [];
  const invites = query.data?.invites ?? [];
  const filteredPlays = filterSortPlays(plays, filters);
  return (
    <>
      <PlaysFilters onFiltersChange={handleFiltersChange} />
      <ul className={styles.plays}>
        {invites.length ? <PlayInvites invites={invites} /> : null}
        {query.isError ? (
          <UnexpectedError error={query.error?.message} />
        ) : query.isLoading ? (
          <>
            <li className={styles.playSkeleton}>
              <Skeleton />
            </li>
            <li className={styles.playSkeleton}>
              <Skeleton />
            </li>
            <li className={styles.playSkeleton}>
              <Skeleton />
            </li>
          </>
        ) : plays.length ? (
          filteredPlays.length ? (
            filteredPlays.map(
              ({
                uri,
                isOwner,
                title,
                lastModifiedDate,
                createdDate,
                ownerUsername,
                ownerFullName,
              }) => (
                <PlayListItem
                  key={uri}
                  id={uri}
                  ownerUsername={ownerUsername}
                  ownerFullName={ownerFullName}
                  isOwner={isOwner}
                  title={title}
                  lastModifiedDate={lastModifiedDate}
                  creationDate={createdDate}
                />
              ),
            )
          ) : (
            <NoFilteredPlays />
          )
        ) : (
          <NoPlays />
        )}
        {query.isRefetching ? (
          <div className={styles.loaderContainer}>
            <DotsLoader />
          </div>
        ) : null}
      </ul>
    </>
  );
}

export default PlayList;
