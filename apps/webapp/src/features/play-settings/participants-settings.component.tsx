import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ASSIGNABLE_PLAY_ROLES,
  PLAY_ROLE_PERMISSIONS,
  type AssignablePlayRole,
} from "@marivo/utils";
import { useTRPC } from "../../trpc";
import { usePlayContext } from "../play-admin/play.context";
import styles from "./participants-settings.module.css";

const PERMISSION_LABELS: Record<string, string> = {
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

const PERMISSION_GROUPS: { labelKey: string; keys: string[] }[] = [
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

const ROLE_COLUMNS = ["owner", ...ASSIGNABLE_PLAY_ROLES] as const;

function isAssignableRole(role: string): role is AssignablePlayRole {
  return (ASSIGNABLE_PLAY_ROLES as readonly string[]).includes(role);
}

function ParticipantsSettings() {
  const { t } = useTranslation("settings");
  const playContext = usePlayContext();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutate: setParticipantRole, isPending } = useMutation(
    trpc.plays.setParticipantRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.plays.playDetails.queryKey(),
        });
      },
    }),
  );

  const data = playContext?.dataOr(undefined);
  const details = data?.details;
  const participants = data?.participants ?? {};
  const permissions = data?.permissions;
  const canManage = Boolean(details?.isOwner || permissions?.settingsWrite);

  const handleRoleChange = (username: string, role: string) => {
    if (!details || !isAssignableRole(role)) return;
    setParticipantRole({ uri: details.uri, username, role });
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
              {Object.entries(participants).map(([username, info]) => (
                <tr key={username}>
                  <td>
                    {info.fullName} ({username})
                  </td>
                  <td>
                    {info.role === "owner" || !canManage ? (
                      <span>{info.role ?? "—"}</span>
                    ) : (
                      <select
                        aria-label={t("participants.roleFor", { username })}
                        disabled={isPending}
                        value={info.role ?? ""}
                        onChange={(e) => handleRoleChange(username, e.target.value)}
                      >
                        {!info.role ? <option value="">—</option> : null}
                        {ASSIGNABLE_PLAY_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
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
              {ROLE_COLUMNS.map((role) => (
                <th key={role}>{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <GroupRows key={group.labelKey} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({ group }: { group: { labelKey: string; keys: string[] } }) {
  const { t } = useTranslation("settings");
  return (
    <>
      <tr className={styles.permissionsTableGroupRow}>
        <td colSpan={ROLE_COLUMNS.length + 1}>{t(group.labelKey)}</td>
      </tr>
      {group.keys.map((key) => (
        <tr key={key} className={styles.permissionsTablePermissionRow}>
          <td>{PERMISSION_LABELS[key] ?? key}</td>
          {ROLE_COLUMNS.map((role) => (
            <td key={role}>
              <input
                type="checkbox"
                checked={
                  PLAY_ROLE_PERMISSIONS[role][key as keyof (typeof PLAY_ROLE_PERMISSIONS)["owner"]]
                }
                readOnly
                disabled
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default ParticipantsSettings;
