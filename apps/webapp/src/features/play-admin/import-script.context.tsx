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
import { useQuery } from "@tanstack/react-query";
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
  step: Step | undefined;
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
  const [searchParams] = useSearchParams();
  const resumeImportId = searchParams.get("resume");
  // Server-side generated: empty until initImportScript returns it (or when
  // resuming an existing import via ?resume=). The status poll only runs once
  // a real id exists, so a fresh page never polls a non-existent import.
  const [importId, setImportId] = useState(resumeImportId ?? "");
  const [step, setStep] = useState<Step | undefined>(
    resumeImportId
      ? undefined
      : {
          name: "import",
          importId: "",
          processing: false,
        },
  );
  const statusQry = trpc.plays.importScriptStatus.queryOptions({
    importId,
  });
  // Poll while the user is on the import step (or resuming): this is what
  // drives the uploading -> processing -> reviewing/error transitions.
  statusQry.enabled = Boolean(importId) && (step === undefined || step.name === "import");
  statusQry.refetchInterval = 5000;
  const { status: statusStatus, data: statusData } = useQuery(statusQry);
  useEffect(() => {
    if (statusStatus === "success" && statusData.id === importId) {
      switch (statusData.status) {
        case "processing_files":
        case "uploading_files":
          setStep((prev) => {
            if (
              !prev ||
              prev.name !== "import" ||
              !prev.processing ||
              prev.importId !== importId
            ) {
              return {
                name: "import",
                importId,
                processing: true,
              };
            }
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
        case "reviewing":
          setStep((prev) => {
            if (
              !prev ||
              (prev &&
                (prev.name !== "preview" ||
                  prev.metadata !== statusData.metadata ||
                  prev.importId !== importId))
            ) {
              return {
                name: "preview",
                importId,
                metadata: statusData.metadata,
              };
            }
          });
          break;
      }
    }
  }, [statusStatus, statusData, importId]);
  // The poll only runs once a server-generated (or resumed) importId exists,
  // so a query failure here genuinely means the import is gone. The importId
  // guard also prevents a stale cached error from re-appearing after Start over.
  useEffect(() => {
    const onImportStep = step === undefined || step.name === "import";
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
