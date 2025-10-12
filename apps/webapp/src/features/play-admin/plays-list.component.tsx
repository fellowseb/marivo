import { NavLink } from 'react-router';
import styles from './plays-list.module.css';
import type { PlayListItemModel } from './plays.models';

interface PlayInviteItemProps {
  id: string;
  title: string;
  owner: string;
}

function PlayInviteItem(props: PlayInviteItemProps) {
  return (
    <li className={styles.invite}>
      <span>
        {props.owner} invited you to participate to the play{' '}
        <div className={styles.playTitle}>{props.title}</div>
      </span>
      <div className={styles.inviteActions}>
        <button>✓ Accept</button>
        <button>𐄂 Decline</button>
      </div>
    </li>
  );
}

interface PlayListItemProps {
  id: string;
  title: string;
  owner: string;
  creationDate: Date;
  lastModifiedDate?: Date;
}

function PlayListItem(props: PlayListItemProps) {
  return (
    <li className={styles.play}>
      <NavLink
        replace
        to={{
          pathname: '/play/' + props.id,
        }}
      >
        <div className={styles.playPoster}></div>
        <div className={styles.playDetails}>
          <span className={styles.playTitle}>{props.title}</span>
          <span>
            Owned by{' '}
            <span className={styles.playDetailsValues}>{props.owner}</span>
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
              {props.lastModificationDate
                ? props.lastModificationDate.toLocaleString()
                : '—'}
            </span>
          </span>
        </div>
      </NavLink>
    </li>
  );
}

export interface ParticipationInvite {
  id: string;
  owner: string;
  title: string;
}

export interface PlayInvitesProps {
  invites: ParticipationInvite[];
}

export function PlayInvites(props: PlayInvitesProps) {
  return (
    <ul className={styles.invites}>
      {props.invites.map(({ id, owner, title }) => (
        <PlayInviteItem key={id} id={id} owner={owner} title={title} />
      ))}
    </ul>
  );
}

interface PlayListProps {
  plays: PlayListItemModel[];
}

function PlayList(props: PlayListProps) {
  return (
    <ul className={styles.plays}>
      {props.plays.map(
        ({ uri, isOwner, title, lastModifiedDate, createdDate }) => (
          <PlayListItem
            key={uri}
            id={uri}
            owner={isOwner ? 'you' : 'Someone else'}
            title={title}
            lastModifiedDate={lastModifiedDate}
            creationDate={createdDate}
          />
        ),
      )}
    </ul>
  );
}

export default PlayList;
