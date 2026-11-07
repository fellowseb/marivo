import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { onlineManager } from "@tanstack/react-query";
import { useNotifications } from "../components/notifications.context.tsx";

export function useNetworkStatusNotifier() {
  const { showNotification } = useNotifications();
  const { t } = useTranslation("notifications");
  useEffect(() => {
    return onlineManager.subscribe((isOnline) => {
      showNotification({
        id: "NetworkStatus",
        message: isOnline ? t("network.backOnline") : t("network.offline"),
        icon: isOnline ? "online" : "offline",
        type: "info",
        autoHide: true,
      });
    });
  }, [showNotification, t]);
}
