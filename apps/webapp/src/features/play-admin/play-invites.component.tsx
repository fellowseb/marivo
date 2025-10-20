import styles from './play-invites.module.css';
import Button from '../../components/button.components';

interface PlayInviteItemProps {
  id: string;
  title: string;
  ownerUsername?: string;
  ownerFullName?: string;
  sentDate: Date;
}

function PlayInviteItem(props: PlayInviteItemProps) {
  const handleAccept = () => {};
  const handleDecline = () => {};
  const ownerIdString =
    props.ownerFullName || props.ownerUsername
      ? `${props.ownerFullName} (${props.ownerUsername})`
      : 'Someone';
  return (
    <li className={styles.invite}>
      <span>
        <div className={styles.playTitle}>{props.title}</div>
        {ownerIdString} invited you to participate to the play.
        <div>Sent on: {props.sentDate.toLocaleString()}</div>
      </span>
      <div className={styles.inviteActions}>
        <Button icon="accept" onClick={handleAccept}>
          Accept
        </Button>
        <Button icon="decline" onClick={handleDecline}>
          Decline
        </Button>
      </div>
    </li>
  );
}

export interface ParticipationInvite {
  uri: string;
  ownerFullName?: string;
  ownerUsername?: string;
  playTitle: string;
  sentDate: Date;
}

export interface PlayInvitesProps {
  invites: ParticipationInvite[];
}

export function PlayInvites(props: PlayInvitesProps) {
  return (
    <>
      {props.invites.map(
        ({ uri, ownerFullName, ownerUsername, playTitle, sentDate }) => (
          <PlayInviteItem
            key={uri}
            id={uri}
            ownerFullName={ownerFullName}
            ownerUsername={ownerUsername}
            title={playTitle}
            sentDate={sentDate}
          />
        ),
      )}
    </>
  );
}
