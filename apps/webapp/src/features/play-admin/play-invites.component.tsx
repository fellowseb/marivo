import styles from './play-invites.module.css';
import Button from '../../components/button.components';
import { useTRPC } from '../../trpc';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import classNames from 'classnames';

interface PlayInviteItemProps {
  id: string;
  title: string;
  ownerUsername?: string;
  ownerFullName?: string;
  sentDate: Date;
  respondedToInvite: (params: { isSuccess: boolean }) => void;
}

function PlayInviteItem(props: PlayInviteItemProps) {
  const trpc = useTRPC();
  const {
    mutate: mutateAccept,
    isSuccess: isSuccessAccept,
    isError: isErrorAccept,
    isPending: isPendingAccept,
  } = useMutation(trpc.plays.respondToInvite.mutationOptions());
  const {
    mutate: mutateDecline,
    isSuccess: isSuccessDecline,
    isError: isErrorDecline,
    isPending: isPendingDecline,
  } = useMutation(trpc.plays.respondToInvite.mutationOptions());
  const handleAccept = async () => {
    mutateAccept({
      inviteUri: props.id,
      accept: true,
    });
  };
  const handleDecline = () => {
    mutateDecline({
      inviteUri: props.id,
      accept: false,
    });
  };
  const isSuccess = isSuccessAccept || isSuccessDecline;
  const isError = isErrorAccept || isErrorDecline;
  const isPending = isPendingAccept || isPendingDecline;
  useEffect(() => {
    if (isSuccess || isError) {
      const timeoutId = setTimeout(() => {
        props.respondedToInvite({ isSuccess });
      }, 700);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [props.respondedToInvite, isSuccess, isError]);
  const ownerIdString =
    props.ownerFullName || props.ownerUsername
      ? `${props.ownerFullName} (${props.ownerUsername})`
      : 'Someone';
  return (
    <li
      className={classNames({
        [styles.invite]: true,
        [styles.removed]: isSuccess,
      })}
    >
      <span>
        <div className={styles.playTitle}>{props.title}</div>
        {ownerIdString} invited you to participate to the play.
        <div>Sent on: {props.sentDate.toLocaleString()}</div>
      </span>
      <div className={styles.inviteActions}>
        <Button
          icon={isPendingAccept ? 'animatedWaiting' : 'accept'}
          onClick={handleAccept}
          disabled={isPending || isSuccess}
        >
          Accept
        </Button>
        <Button
          icon={isPendingDecline ? 'animatedWaiting' : 'decline'}
          onClick={handleDecline}
          disabled={isPending || isSuccess}
        >
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
  respondedToInvite: (params: { isSuccess: boolean }) => void;
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
            respondedToInvite={props.respondedToInvite}
          />
        ),
      )}
    </>
  );
}
