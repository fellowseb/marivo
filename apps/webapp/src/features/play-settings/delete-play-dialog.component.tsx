import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTRPC } from '../../trpc';
import Button from '../../components/button.component';
import { Dialog } from '../../components/dialog.component';
import styles from './delete-play-dialog.module.css';
import { useNotifications } from '../../components/notifications.context';
import DotsLoader from '../../components/dots-loader.component';

interface DeletePlayDialogProps {
  playTitle: string;
  playUri: string;
  onClose: () => void;
}

export function DeletePlayDialog(props: DeletePlayDialogProps) {
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const trpc = useTRPC();

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation(
    trpc.plays.delete.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: [trpc.plays.list.queryKey],
        });
      },
    }),
  );

  const handleDelete = () => {
    mutate(
      { uri: props.playUri },
      {
        onSuccess: () => {
          showNotification({
            autoHide: true,
            message: `Play "${props.playTitle}" has been deleted`,
            type: 'info',
          });
          navigate({ pathname: '/plays' });
        },
        onError: (error) => {
          showNotification({
            autoHide: true,
            message: error.message || 'Failed to delete play',
            type: 'error',
          });
          props.onClose();
        },
      },
    );
  };

  const handleCancel = () => {
    props.onClose();
  };

  return (
    <Dialog
      icon="delete"
      customClassNames={[styles.deleteDialog]}
      title="Delete current play project"
      actions={
        <>
          <Button icon="delete" onClick={handleDelete} disabled={isPending}>
            {isPending ? <DotsLoader size="small" /> : 'Delete'}
          </Button>
          <Button icon="clear" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
        </>
      }
    >
      <p>
        Are you sure you want to delete the current play project &quot;
        {props.playTitle}&quot;? This action is <strong>IRREVERSIBLE</strong> as
        all related data will be wiped out.
      </p>
      <p>
        You may instead want to <strong>archive it</strong> to disable all
        modifications from participants.
      </p>
    </Dialog>
  );
}

export default DeletePlayDialog;
