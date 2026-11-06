import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../../trpc";

interface ImportScriptMetadata {
  title: string;
  author: string;
  language: string;
  number_of_roles: number;
  number_of_male_roles: number;
  number_of_female_roles: number;
  genre?: string | undefined;
  period?: string | undefined;
  suggestions?: Record<string, string>;
}

type Step =
  | {
      name: "import";
      importId: string;
      processing: boolean;
      /** Failure reason shown on the import page (worker error or lost import). */
      error?: string | undefined;
    }
  | { name: "preview"; importId: string; metadata: ImportScriptMetadata }
  | { name: "name"; importId: string; metadata: ImportScriptMetadata };

interface ImportScriptContext {
  step: Step;
  /** Empty on a fresh page until initImportScript returns the server-generated id. */
  importId: string;
  setImportId: (importId: string) => void;
  startOver: () => void;
  reviewDone: () => void;
  backToReview: () => void;
}

const ImportScriptContext = createContext<ImportScriptContext | undefined>(undefined);

export function ImportScriptContextProvider(props: PropsWithChildren) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const resumeImportId = searchParams.get("resume");
  // Server-side generated: empty until initImportScript returns it (or when
  // resuming an existing import via ?resume=). The status poll only runs once
  // a real id exists, so a fresh page never polls a non-existent import.
  const [importId, setImportId] = useState(resumeImportId ?? "");
  // The flow always starts on the import step — including when resuming — so
  // the page never falls back to a full-page loader while the first status
  // poll is in flight. Exception: when resuming and the imports page already
  // prefetched the script into the cache, start directly on the preview step
  // (metadata is filled in by the first status poll below).
  const [step, setStep] = useState<Step>(() => {
    if (resumeImportId) {
      const cached = queryClient.getQueryData(
        trpc.script.latestChanges.queryOptions({
          since: new Date(0),
          uri: resumeImportId,
          from: "import",
        }).queryKey,
      );
      if (cached) {
        return {
          name: "preview",
          importId: resumeImportId,
          metadata: {
            title: "",
            author: "",
            language: "",
            number_of_roles: 0,
            number_of_male_roles: 0,
            number_of_female_roles: 0,
          },
        };
      }
    }
    return {
      name: "import",
      importId: resumeImportId ?? "",
      processing: Boolean(resumeImportId),
    };
  });
  const statusQry = trpc.plays.importScriptStatus.queryOptions({
    importId,
  });
  // Poll until the flow is past the preview step (import or preview): this is
  // what drives the uploading -> processing -> reviewing/error transitions.
  statusQry.enabled = Boolean(importId) && step.name !== "name";
  statusQry.refetchInterval = 5000;
  const { status: statusStatus, data: statusData } = useQuery(statusQry);
  // Fetch the imported script as soon as the import becomes reviewable. The
  // flow stays on the import page (with its processing indicator) until this
  // resolves, so the preview step never mounts into a full-page suspense
  // fallback showing only the banner and a dots loader.
  const previewQuery = useQuery({
    ...trpc.script.latestChanges.queryOptions({
      since: new Date(0),
      uri: importId,
      from: "import",
    }),
    // On resume, fetch right away (the imports page usually warmed the cache);
    // otherwise wait until the status poll reports "reviewing".
    enabled:
      Boolean(importId) && (resumeImportId !== null || statusData?.status === "reviewing"),
  });
  useEffect(() => {
    if (statusStatus === "success" && statusData.id === importId) {
      switch (statusData.status) {
        case "processing_files":
        case "uploading_files":
        case "reviewing":
          // "reviewing" also keeps the import page visible: the preview step
          // only mounts once previewQuery has the script (see effect below).
          setStep((prev) => {
            // Never bounce back from preview/name to the import step on a poll.
            if (prev.name !== "import") {
              return prev;
            }
            if (!prev.processing || prev.importId !== importId) {
              return {
                name: "import",
                importId,
                processing: true,
              };
            }
            return prev;
          });
          break;
        case "error":
          setStep({
            name: "import",
            importId,
            processing: false,
            error: statusData.error ?? "The import failed.",
          });
          break;
      }
    }
  }, [statusStatus, statusData, importId]);
  // Advance to the preview step only once the script payload is actually
  // loaded, so the user waits on the import page instead of on a blank
  // suspense fallback. The suspense query in the preview reuses this cache.
  useEffect(() => {
    if (
      statusStatus === "success" &&
      statusData.id === importId &&
      statusData.status === "reviewing" &&
      previewQuery.data &&
      step.name === "import"
    ) {
      setStep({
        name: "preview",
        importId,
        metadata: statusData.metadata,
      });
    }
  }, [statusStatus, statusData, importId, previewQuery.data, step]);
  // A warm-cache resume starts on preview before the first status poll: fill
  // in the real metadata as soon as the poll returns it.
  useEffect(() => {
    if (
      statusStatus === "success" &&
      statusData.id === importId &&
      statusData.status === "reviewing"
    ) {
      setStep((prev) =>
        prev.name === "preview" ? { ...prev, metadata: statusData.metadata } : prev,
      );
    }
  }, [statusStatus, statusData, importId]);
  // The poll only runs once a server-generated (or resumed) importId exists,
  // so a query failure here genuinely means the import is gone. The importId
  // guard also prevents a stale cached error from re-appearing after Start over.
  useEffect(() => {
    const onImportStep = step.name === "import";
    if (statusStatus === "error" && importId && onImportStep) {
      setStep({
        name: "import",
        importId,
        processing: false,
        error: "This import is no longer available. You can start over.",
      });
    }
  }, [statusStatus, step, importId]);
  const startOver = useCallback(() => {
    setImportId("");
    setStep({
      name: "import",
      importId: "",
      processing: false,
    });
  }, []);
  const reviewDone = useCallback(() => {
    setStep((prev) => {
      if (prev?.name !== "preview") {
        return prev;
      }
      return {
        name: "name",
        importId,
        metadata: prev.metadata,
      };
    });
  }, [importId]);
  const backToReview = useCallback(() => {
    setStep((prev) => {
      if (prev?.name !== "name") {
        return prev;
      }
      return {
        name: "preview",
        importId,
        metadata: prev.metadata,
      };
    });
  }, [importId]);

  const context = useMemo<ImportScriptContext>(
    () => ({
      step,
      importId,
      setImportId,
      startOver,
      reviewDone,
      backToReview,
    }),
    [step, importId, startOver, reviewDone, backToReview],
  );
  return (
    <ImportScriptContext.Provider value={context}>{props.children}</ImportScriptContext.Provider>
  );
}

export function useImportScriptContext(): ImportScriptContext {
  const context = useContext(ImportScriptContext);
  if (!context) {
    throw new Error("No import script context");
  }
  return context;
}
