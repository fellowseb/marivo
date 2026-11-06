import { useState } from "react";
import { useNavigate } from "react-router";
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

function getStatusLabel(status: ScriptImport["status"]): string {
  switch (status) {
    case "uploading_files":
      return "Uploading files";
    case "processing_files":
      return "Processing files";
    case "reviewing":
      return "Reviewing";
    case "done":
      return "Done";
    case "error":
      return "Error";
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
        <span className={styles.itemDate}>{imp.createdAt.toLocaleString()}</span>
        <span
          className={
            styles[`statusBadge${statusVariant.charAt(0).toUpperCase() + statusVariant.slice(1)}`]
          }
        >
          {getStatusLabel(imp.status)}
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
          Resume
        </Button>
        <Button
          icon={deleteMutation.isPending ? "animatedWaiting" : "delete"}
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
        >
          Delete
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
  const trpc = useTRPC();
  const queryOpts = trpc.plays.allScriptImports.queryOptions();
  queryOpts.refetchInterval = 5000;
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
            Ongoing imports ({ongoing.length})
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
