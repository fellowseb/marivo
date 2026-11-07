import { Trans, useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useTRPC } from "../../trpc";
import Button from "../../components/button.component";
import { Dialog } from "../../components/dialog.component";
import styles from "./delete-play-dialog.module.css";
import { useNotifications } from "../../components/notifications.context";
import DotsLoader from "../../components/dots-loader.component";

interface DeletePlayDialogProps {
  playTitle: string;
  playUri: string;
  onClose: () => void;
}

export function DeletePlayDialog(props: DeletePlayDialogProps) {
  const { t } = useTranslation("settings");
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
            type: "info",
          });
          navigate({ pathname: "/plays" });
        },
        onError: (error) => {
          showNotification({
            autoHide: true,
            message: error.message || t("deleteDialog.errorFallback"),
            type: "error",
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
      title={t("deleteDialog.title")}
      actions={
        <>
          <Button icon="delete" onClick={handleDelete} disabled={isPending}>
            {isPending ? <DotsLoader size="small" /> : t("deleteDialog.delete")}
          </Button>
          <Button icon="clear" onClick={handleCancel} disabled={isPending}>
            {t("deleteDialog.cancel")}
          </Button>
        </>
      }
    >
      <p>
        <Trans
          i18nKey="settings:deleteDialog.body1"
          values={{ title: props.playTitle }}
          components={{ strong: <strong /> }}
        />
      </p>
      <p>
        <Trans i18nKey="settings:deleteDialog.body2" components={{ strong: <strong /> }} />
      </p>
    </Dialog>
  );
}

export default DeletePlayDialog;
