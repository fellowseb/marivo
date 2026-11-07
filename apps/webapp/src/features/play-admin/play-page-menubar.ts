import type { MenuBarDefinition } from "../../components/menubar.component";
import type { TFunction } from "i18next";

export function makePlayMenuDefinition(t: TFunction<"layout">): MenuBarDefinition {
  return {
    items: [
      {
        label: t("playMenu.script"),
        path: "../script",
        icon: "script",
        accessPermission: "scriptRead",
      },
      {
        label: t("playMenu.stagingNotes"),
        path: "../staging-notes",
        icon: "staging",
        accessPermission: "stagingNotesRead",
      },
      {
        label: t("playMenu.blocking"),
        path: "../blocking",
        icon: "blocking",
        accessPermission: "blockingRead",
      },
      {
        label: t("playMenu.memorization"),
        path: "../memorize",
        icon: "memorize",
        accessPermission: "memorizeRead",
      },
      {
        label: t("playMenu.planning"),
        path: "../planning",
        icon: "planning",
        accessPermission: "planningRead",
      },
      {
        label: t("playMenu.settings"),
        path: "../settings",
        icon: "settings",
        accessPermission: "settingsRead",
      },
    ],
  };
}
