import { useState } from 'react';
import { NavLink } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useTRPC } from '../../trpc';
import styles from './plays-list.module.css';
import Skeleton from '../../components/skeleton.component';
import PlaysFilters, {
  DEFAULT_FILTER_OPTIONS,
} from './plays-filters.component';
import { filterSortPlays, type PlayFilterSortOptions } from './plays.lib';
import { PlayInvites } from './play-invites.component';
import UnexpectedError from '../../components/unexpected-error.component';
import DotsLoader from '../../components/dots-loader.component';
import { PLAY_ROUTE_BASE } from './play-page.component';

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
    <li
      className={classNames({
        [styles.play]: true,
      })}
    >
      <NavLink
        to={{
          pathname: PLAY_ROUTE_BASE.replace(':uri', props.id),
        }}
      >
        <span className={styles.playTitle}>{props.title}</span>
        <div className={styles.playDetails}>
          Owned by <span className={styles.playDetailsValues}>{ownerStr}</span>
          Créée le{' '}
          <span className={styles.playDetailsValues}>
            {props.creationDate.toLocaleString()}
          </span>
          Dernière modification le{' '}
          <span className={styles.playDetailsValues}>
            {props.lastModifiedDate
              ? props.lastModifiedDate.toLocaleString()
              : '—'}
          </span>
        </div>
        <div className={styles.playPoster}>
          <div
            className={classNames({
              [styles.playPosterOverlay]: true,
            })}
          ></div>
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
      <p>All received invites will be displayed on this page.</p>
      <p>
        You can also{' '}
        <NavLink
          to={{
            pathname: 'new',
          }}
        >
          create a new play yourself
        </NavLink>
        {'. '}
      </p>
    </div>
  );
}

function PlayList() {
  const trpc = useTRPC();
  const query = useQuery(trpc.plays.list.queryOptions());
  const [filters, setFilters] = useState<PlayFilterSortOptions>(
    DEFAULT_FILTER_OPTIONS,
  );
  const handleFiltersChange = (filters: PlayFilterSortOptions) => {
    setFilters(filters);
  };
  const plays = query.data?.plays ?? [];
  const invites = query.data?.invites ?? [];
  const filteredPlays = filterSortPlays(plays, filters);
  const handleRespondedToInvite = () => {
    query.refetch();
  };
  return (
    <>
      <PlaysFilters onFiltersChange={handleFiltersChange} filters={filters} />
      <ul className={styles.plays}>
        {invites.length ? (
          <PlayInvites
            invites={invites}
            respondedToInvite={handleRespondedToInvite}
          />
        ) : null}
        {query.isError ? (
          <UnexpectedError error={query.error?.message} />
        ) : query.isLoading ? (
          <>
            <li className={styles.playSkeleton}>
              <Skeleton hideImage={true} />
            </li>
            <li className={styles.playSkeleton}>
              <Skeleton hideImage={true} />
            </li>
            <li className={styles.playSkeleton}>
              <Skeleton hideImage={true} />
            </li>
            <li className={styles.playSkeleton}>
              <Skeleton hideImage={true} />
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
