import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";
import Button from "../../components/button.component";
import Icon from "../../components/icon.component";
import CollapsibleSection from "../../components/collapsible-section.component";
import styles from "./ongoing-imports-section.module.css";
import Container from "../../components/container.component";

interface ScriptImport {
  id: string;
  createdAt: Date;
  status: "uploading_files" | "processing_files" | "reviewing" | "done" | "error";
  error: string | null;
  /** Imported script title, present when status is "reviewing". */
  title: string | null;
}

const ONGOING_STATUSES = ["uploading_files", "processing_files", "reviewing"];

function getStatusLabel(t: TFunction<"newPlay">, status: ScriptImport["status"]): string {
  switch (status) {
    case "uploading_files":
      return t("ongoingImports.status.uploadingFiles");
    case "processing_files":
      return t("ongoingImports.status.processingFiles");
    case "reviewing":
      return t("ongoingImports.status.reviewing");
    case "done":
      return t("ongoingImports.status.done");
    case "error":
      return t("ongoingImports.status.error");
    default:
      return status;
  }
}

function getStatusVariant(status: ScriptImport["status"]): "ongoing" | "done" | "error" {
  switch (status) {
    case "done":
      return "done";
    case "error":
      return "error";
    default:
      return "ongoing";
  }
}

function OngoingImportItem({ imp }: { imp: ScriptImport }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("newPlay");
  const [resuming, setResuming] = useState(false);
  const isReviewing = imp.status === "reviewing";
  const statusVariant = getStatusVariant(imp.status);

  const deleteMutation = useMutation(
    trpc.plays.deleteScriptImport.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.plays.allScriptImports.queryKey(),
        });
      },
    }),
  );

  // On Resume: disable the button with a waiting icon, prefetch the script
  // into the cache, then navigate — so the flow lands directly on the preview.
  const handleResume = async () => {
    if (resuming || !isReviewing) {
      return;
    }
    setResuming(true);
    await queryClient.prefetchQuery(
      trpc.script.latestChanges.queryOptions({
        since: new Date(0),
        uri: imp.id,
        from: "import",
      }),
    );
    navigate(`/plays/new/import?resume=${imp.id}`);
  };

  const handleDelete = () => {
    if (deleteMutation.isPending) {
      return;
    }
    deleteMutation.mutate({ importId: imp.id });
  };

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <span className={styles.itemDate}>{imp.createdAt.toLocaleString(i18n.language)}</span>
        <span
          className={
            styles[`statusBadge${statusVariant.charAt(0).toUpperCase() + statusVariant.slice(1)}`]
          }
        >
          {getStatusLabel(t, imp.status)}
        </span>
        {isReviewing && imp.title ? (
          <span className={styles.itemTitle} title={imp.title}>
            ({imp.title})
          </span>
        ) : null}
      </div>
      <div className={styles.itemActions}>
        <Button
          icon={resuming || !isReviewing ? "animatedWaiting" : "next"}
          disabled={!isReviewing || resuming}
          onClick={handleResume}
        >
          {t("ongoingImports.resume")}
        </Button>
        <Button
          icon={deleteMutation.isPending ? "animatedWaiting" : "delete"}
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
        >
          {t("ongoingImports.delete")}
        </Button>
      </div>
    </li>
  );
}

/**
 * Expandable list of the user's ongoing script imports, shown on the
 * "Import script from an external source" page. Polls every 5s so statuses
 * and the Resume gating update on their own.
 */
export function OngoingImportsSection() {
  const { t } = useTranslation("newPlay");
  const trpc = useTRPC();
  const queryOpts = trpc.plays.allScriptImports.queryOptions();
  queryOpts.refetchInterval = 5000;
  // Never show stale values when the page mounts: the app-wide staleTime is
  // 60s, so force an immediate refetch on mount.
  queryOpts.staleTime = 0;
  queryOpts.refetchOnMount = "always";
  const { data } = useQuery(queryOpts);

  const ongoing = (data ?? []).filter((imp) => ONGOING_STATUSES.includes(imp.status));
  if (ongoing.length === 0) {
    return null;
  }

  return (
    <Container style={{ maxWidth: 800 }}>
      <CollapsibleSection
        Header={
          <span className={styles.headerTitle}>
            <Icon value="import" size="small" mode="primary" />
            {t("ongoingImports.header", { n: ongoing.length })}
          </span>
        }
      >
        <ul className={styles.list}>
          {ongoing.map((imp) => (
            <OngoingImportItem key={imp.id} imp={imp} />
          ))}
        </ul>
      </CollapsibleSection>
    </Container>
  );
}
