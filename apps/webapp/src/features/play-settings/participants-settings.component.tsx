import { useState } from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlayPermission, PlayPermissions } from "@marivo/utils";
import { useTRPC } from "../../trpc";
import { usePlayContext } from "../play-admin/play.context";
import styles from "./participants-settings.module.css";
import Button from "../../components/button.component";
import Flex from "../../components/flex.component";

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
  {
    labelKey: "participants.stagingDirections",
    keys: ["stagingNotesRead", "stagingNotesWrite"],
  },
  {
    labelKey: "participants.blocking",
    keys: ["blockingRead", "blockingWrite"],
  },
  { labelKey: "participants.memorize", keys: ["memorizeRead"] },
  {
    labelKey: "participants.planning",
    keys: ["planningRead", "planningWrite"],
  },
  {
    labelKey: "participants.settings",
    keys: ["settingsRead", "settingsWrite"],
  },
];

type RoleInfo = {
  id: number;
  name: string;
  builtin: boolean;
  permissions: PlayPermissions;
};

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
  const [newRoleName, setNewRoleName] = useState("");
  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.plays.playDetails.queryKey(),
    });
  };
  const { mutate: setParticipantRole, isPending: rolePending } = useMutation(
    trpc.plays.setParticipantRole.mutationOptions({ onSuccess: invalidate }),
  );
  const { mutate: addRole, isPending: addPending } = useMutation(
    trpc.plays.addRole.mutationOptions({ onSuccess: invalidate }),
  );
  const { mutate: removeRole, isPending: removePending } = useMutation(
    trpc.plays.removeRole.mutationOptions({ onSuccess: invalidate }),
  );
  const { mutate: updateRolePermissions, isPending: permissionsPending } = useMutation(
    trpc.plays.updateRolePermissions.mutationOptions({
      onSuccess: invalidate,
    }),
  );

  const data = playContext?.dataOr(undefined);
  const details = data?.details;
  const participants = (data?.participants ?? {}) as Record<string, ParticipantInfo>;
  const roles = (data?.roles ?? []) as RoleInfo[];
  const permissions = data?.permissions;
  const canManage = Boolean(details?.isOwner || permissions?.settingsWrite);

  const handleRoleChange = (username: string, roleName: string) => {
    if (!details || !roleName) return;
    setParticipantRole({ uri: details.uri, username, role: roleName });
  };

  const handlePermissionToggle = (role: RoleInfo, key: PlayPermission, checked: boolean) => {
    if (!details || role.builtin) return;
    updateRolePermissions({
      uri: details.uri,
      roleName: role.name,
      permissions: { ...role.permissions, [key]: checked },
    });
  };

  const handleAddRole = () => {
    const name = newRoleName.trim();
    if (!details || !name) return;
    addRole({ uri: details.uri, name });
    setNewRoleName("");
  };

  return (
    <div className={styles.container}>
      <div className={classNames([styles.section])}>
        <div className={classNames([styles.sectionTitle])}>{t("participants.title")}</div>
        <div className={styles.line}>
          <table className={styles.participantsTable}>
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
                        disabled={rolePending}
                        value={info.role ?? ""}
                        onChange={(e) => handleRoleChange(username, e.target.value)}
                      >
                        {!info.role ? <option value="">—</option> : null}
                        {roles
                          .filter((role) => !role.builtin)
                          .map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name}
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
        {canManage ? (
          <Flex gap={10} justify="flex-end">
            <input
              type="text"
              size={20}
              placeholder={t("participants.newRolePlaceholder")}
              aria-label={t("participants.newRolePlaceholder")}
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
            <Button disabled={addPending || !newRoleName.trim()} onClick={handleAddRole}>
              {t("participants.addRole")}
            </Button>
          </Flex>
        ) : null}
        <table className={styles.permissionsTable}>
          <thead>
            <tr>
              <th></th>
              {roles.map((role) => (
                <th key={role.id}>
                  {role.builtin ? t("participants.owner") : role.name}
                  {canManage && !role.builtin ? (
                    <button
                      className={styles.deleteFunctionBtn}
                      aria-label={t("participants.removeRole", {
                        role: role.name,
                      })}
                      disabled={removePending}
                      onClick={() =>
                        details && removeRole({ uri: details.uri, roleName: role.name })
                      }
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <GroupRows
                key={group.labelKey}
                group={group}
                roles={roles}
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
  roles: RoleInfo[];
  canManage: boolean;
  pending: boolean;
  onToggle: (role: RoleInfo, key: PlayPermission, checked: boolean) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <>
      <tr className={styles.permissionsTableGroupRow}>
        <td colSpan={props.roles.length + 1}>{t(props.group.labelKey)}</td>
      </tr>
      {props.group.keys.map((key) => (
        <tr key={key} className={styles.permissionsTablePermissionRow}>
          <td>{PERMISSION_LABELS[key]}</td>
          {props.roles.map((role) => (
            <td key={role.id}>
              <input
                type="checkbox"
                aria-label={`${PERMISSION_LABELS[key]} ${role.name}`}
                checked={role.permissions[key]}
                disabled={role.builtin || !props.canManage || props.pending}
                onChange={(e) => props.onToggle(role, key, e.target.checked)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default ParticipantsSettings;
