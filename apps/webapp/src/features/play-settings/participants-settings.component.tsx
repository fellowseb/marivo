import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ASSIGNABLE_PLAY_ROLES,
  isPlayRole,
  type AssignablePlayRole,
  type PlayPermission,
  type PlayPermissions,
} from "@marivo/utils";
import { useTRPC } from "../../trpc";
import { usePlayContext } from "../play-admin/play.context";
import styles from "./participants-settings.module.css";

const PERMISSION_LABELS: Record<PlayPermission, string> = {
  scriptRead: "view",
  scriptWriteSharedDrafts: "make draft suggestions",
  scriptWrite: "edit",
  stagingNotesRead: "view",
  stagingNotesWrite: "edit",
  blockingRead: "view",
  blockingWrite: "edit",
  memorizeRead: "view",
  planningRead: "view",
  planningWrite: "edit",
  settingsRead: "view",
  settingsWrite: "edit",
};

const PERMISSION_GROUPS: { labelKey: string; keys: PlayPermission[] }[] = [
  {
    labelKey: "participants.script",
    keys: ["scriptRead", "scriptWriteSharedDrafts", "scriptWrite"],
  },
  { labelKey: "participants.stagingDirections", keys: ["stagingNotesRead", "stagingNotesWrite"] },
  { labelKey: "participants.blocking", keys: ["blockingRead", "blockingWrite"] },
  { labelKey: "participants.memorize", keys: ["memorizeRead"] },
  { labelKey: "participants.planning", keys: ["planningRead", "planningWrite"] },
  { labelKey: "participants.settings", keys: ["settingsRead", "settingsWrite"] },
];

function isAssignableRole(role: string): role is AssignablePlayRole {
  return (ASSIGNABLE_PLAY_ROLES as readonly string[]).includes(role);
}

type ParticipantInfo = {
  fullName: string;
  role: string | null;
  permissions: PlayPermissions;
};

function ParticipantsSettings() {
  const { t } = useTranslation("settings");
  const playContext = usePlayContext();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.plays.playDetails.queryKey() });
  };
  const { mutate: setParticipantRole, isPending: rolePending } = useMutation(
    trpc.plays.setParticipantRole.mutationOptions({ onSuccess: invalidate }),
  );
  const { mutate: setParticipantPermissions, isPending: permissionsPending } = useMutation(
    trpc.plays.setParticipantPermissions.mutationOptions({ onSuccess: invalidate }),
  );

  const data = playContext?.dataOr(undefined);
  const details = data?.details;
  const participants = (data?.participants ?? {}) as Record<string, ParticipantInfo>;
  const permissions = data?.permissions;
  const canManage = Boolean(details?.isOwner || permissions?.settingsWrite);
  const usernames = Object.keys(participants);

  const handleRoleChange = (username: string, role: string) => {
    if (!details || !isAssignableRole(role)) return;
    setParticipantRole({ uri: details.uri, username, role });
  };

  const handlePermissionToggle = (username: string, key: PlayPermission, checked: boolean) => {
    if (!details || username === details.ownerUsername) return;
    const current = participants[username]?.permissions;
    if (!current) return;
    setParticipantPermissions({
      uri: details.uri,
      username,
      permissions: { ...current, [key]: checked },
    });
  };

  return (
    <div className={styles.container}>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>{t("participants.title")}</div>
        <div className={styles.line}>
          <table className={styles.permissionsTable}>
            <thead>
              <tr>
                <th>{t("participants.userColumn")}</th>
                <th>{t("participants.roleColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {usernames.map((username) => {
                const info = participants[username];
                const isOwnerRow = info.role === "owner";
                const roleValue = info.role && isPlayRole(info.role) ? info.role : "custom";
                return (
                  <tr key={username}>
                    <td>
                      {info.fullName} ({username})
                    </td>
                    <td>
                      {isOwnerRow || !canManage ? (
                        <span>{isOwnerRow ? "owner" : roleValue}</span>
                      ) : (
                        <select
                          aria-label={t("participants.roleFor", { username })}
                          disabled={rolePending}
                          value={isAssignableRole(roleValue) ? roleValue : "custom"}
                          onChange={(e) => handleRoleChange(username, e.target.value)}
                        >
                          {!isAssignableRole(roleValue) ? (
                            <option value="custom">{t("participants.customRole")}</option>
                          ) : null}
                          {ASSIGNABLE_PLAY_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>{t("participants.matrixTitle")}</div>
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th></th>
              {usernames.map((username) => (
                <th key={username}>{username}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <GroupRows
                key={group.labelKey}
                group={group}
                usernames={usernames}
                participants={participants}
                canManage={canManage}
                pending={permissionsPending}
                onToggle={handlePermissionToggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows(props: {
  group: { labelKey: string; keys: PlayPermission[] };
  usernames: string[];
  participants: Record<string, ParticipantInfo>;
  canManage: boolean;
  pending: boolean;
  onToggle: (username: string, key: PlayPermission, checked: boolean) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <>
      <tr className={styles.permissionsTableGroupRow}>
        <td colSpan={props.usernames.length + 1}>{t(props.group.labelKey)}</td>
      </tr>
      {props.group.keys.map((key) => (
        <tr key={key} className={styles.permissionsTablePermissionRow}>
          <td>{PERMISSION_LABELS[key]}</td>
          {props.usernames.map((username) => {
            const info = props.participants[username];
            const isOwnerRow = info.role === "owner";
            const editable = props.canManage && !isOwnerRow;
            return (
              <td key={username}>
                <input
                  type="checkbox"
                  aria-label={`${PERMISSION_LABELS[key]} ${username}`}
                  checked={info.permissions[key]}
                  disabled={!editable || props.pending}
                  onChange={(e) => props.onToggle(username, key, e.target.checked)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export default ParticipantsSettings;
