import classNames from "classnames";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { NavLink, useNavigate } from "react-router";
import { useUser } from "@clerk/react";
import { useMutation, useMutationState } from "@tanstack/react-query";
import { hasCapability, parseRole } from "@marivo/utils";
import { useTRPC } from "../../trpc";
import Button from "../../components/button.component";
import Icon from "../../components/icon.component";
import FlowStep from "../../components/flow-step.component";
import Admonition from "../../components/admonition.component";
import { HeaderBreadcrumbs } from "../../layouts/header.component";
import DotsLoader from "../../components/dots-loader.component";
import styles from "./import-script.module.css";
import { assertUnreachable } from "@marivo/utils";
import { ImportScriptContextProvider, useImportScriptContext } from "./import-script.context";
import { ImportScriptPreviewToolbar } from "./import-script-preview-toolbar";
import { PreviewScriptStep } from "./preview-script-step.component";
import { NamePlayStep } from "./name-play-step.component";

type ScriptImportFile =
  | {
      id: string;
      type: "url";
      url: string;
    }
  | {
      id: string;
      type: "file";
      file: File;
    };

export function ImportScriptBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: "/plays/new",
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: "/plays/new/import",
          }}
        >
          Import script
        </NavLink>,
      ]}
    />
  );
}

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

function ImportStep() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { step, importId, setImportId, startOver } = useImportScriptContext();
  const { mutate, status: initStatus } = useMutation(
    trpc.plays.initImportScript.mutationOptions({
      onSuccess: (data) => {
        // the importId is server-generated: adopt it once, which starts the
        // status poll; uploads then run under it
        setImportId(data.importId);
      },
    }),
  );
  const opts = trpc.plays.uploadFileForScriptImport.mutationOptions({
    meta: {
      test: true,
    },
    trpc: {
      context: {
        importId,
      },
    },
  });
  const { mutate: mutateUpload, reset: resetUpload, status: statusUpload } = useMutation(opts);
  const uploadsState = useMutationState({
    filters: {
      mutationKey: trpc.plays.uploadFileForScriptImport.mutationKey(),
    },
    select: (mutation) => mutation.state,
  });
  const [files, setFiles] = useState<ScriptImportFile[]>([]);
  const inputFromDiskRef = useRef<HTMLInputElement>(null);
  const inputURLRef = useRef<HTMLInputElement>(null);
  const handleFileInputChange = () => {
    if (isPending) {
      return;
    }
    setFiles((files) => {
      const fileListCount = inputFromDiskRef.current?.files?.length ?? 0;
      const f: ScriptImportFile[] = [];
      for (let index = 0; index < fileListCount; index++) {
        const fi = inputFromDiskRef.current?.files?.item(index);
        if (fi) {
          f.push({
            id: uuidv4(),
            type: "file",
            file: fi,
          });
        }
      }
      return files.concat(f);
    });
  };
  const handleBrowseClick = () => {
    inputFromDiskRef.current?.showPicker();
  };
  const handleSelectedScriptMoveUp = (i: number) => () => {
    setFiles((files) => {
      if (i === 0) {
        return files;
      }
      let newFiles = files.slice(0, i - 1);
      newFiles = newFiles.concat(files[i], files[i - 1]);
      if (i < files.length - 1) {
        newFiles = newFiles.concat(files.slice(i + 1));
      }
      return newFiles;
    });
  };
  const handleSelectedScriptMoveDown = (i: number) => () => {
    setFiles((files) => {
      if (i === files.length - 1) {
        return files;
      }
      let newFiles = files.slice(0, i);
      newFiles = newFiles.concat(files[i + 1], files[i]);
      if (i < files.length - 2) {
        newFiles = newFiles.concat(files.slice(i + 2));
      }
      return newFiles;
    });
  };
  const handleSelectedScriptDelete = (i: number) => () => {
    setFiles((files) => {
      const newFiles = files.slice();
      newFiles.splice(i, 1);
      return newFiles;
    });
  };
  // Files submitted with the last Import click; uploaded once the
  // server-generated importId comes back.
  const [submittedFiles, setSubmittedFiles] = useState<ScriptImportFile[] | null>(null);
  const handleInitImport = () => {
    resetUpload();
    setStarted(true);
    setSubmittedFiles(files);
    mutate({
      files: files.map((f) => {
        return f.type === "url"
          ? f
          : {
              id: f.id,
              type: "file",
              name: f.file.name,
              size: f.file.size,
            };
      }),
    });
  };
  const [scriptLineHovered, setScriptLineHovered] = useState<number | null>(null);
  // Stays true from clicking Import until the status poll reports processing
  // (or an error): closes the gap where the Import button would re-enable
  // between init success and the first poll.
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (step.name === "import" && (step.processing || step.error)) {
      setStarted(false);
    }
  }, [step]);
  useEffect(() => {
    if (initStatus === "error" || statusUpload === "error") {
      setStarted(false);
    }
  }, [initStatus, statusUpload]);

  // Once the server-generated importId is adopted, upload the submitted files.
  useEffect(() => {
    if (initStatus === "success" && importId && submittedFiles) {
      submittedFiles.forEach((entry) => {
        if (entry.type === "file") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry.file as any).id = entry.id;
          mutateUpload(entry.file);
        }
      });
      setSubmittedFiles(null);
    }
  }, [initStatus, importId, submittedFiles]);
  const handleFileLineEnter = (i: number) => () => {
    setScriptLineHovered(i);
  };
  const handleFileLineLeave = () => () => {
    setScriptLineHovered(null);
  };
  const handleURLButtonClick = () => {
    if (isPending) {
      return;
    }
    setFiles((files) => {
      const url = inputURLRef.current?.value;
      if (!url) {
        return files;
      }
      return files.concat({
        id: uuidv4(),
        type: "url",
        url,
      });
    });
  };
  const [dragOver, setDragOver] = useState(false);
  const handleDragEnter = () => {
    setDragOver(true);
  };
  const handleMouseLeave = () => {
    setDragOver(false);
  };
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
  };
  const handleDrop = (event: DragEvent) => {
    if (isPending) {
      event.preventDefault();
      return;
    }
    if (event.dataTransfer.files) {
      const droppedFiles = event.dataTransfer.files;
      setFiles((files) => {
        const fileListCount = droppedFiles.length ?? 0;
        const f: ScriptImportFile[] = [];
        for (let index = 0; index < fileListCount; index++) {
          const fi = droppedFiles.item(index);
          if (fi) {
            f.push({
              id: uuidv4(),
              type: "file",
              file: fi,
            });
          }
        }
        return files.concat(f);
      });
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const handlePrevious = () => {
    navigate("/plays/new");
  };
  const isPending =
    started ||
    initStatus === "pending" ||
    statusUpload === "pending" ||
    (step.name === "import" && step.processing);
  const uploadsPending = uploadsState.filter((s) => s.status === "pending").length;
  const uploadsDone = uploadsState.filter((s) => s.status === "success").length;
  const importError = step.name === "import" ? step.error : undefined;
  return (
    <FlowStep
      title="Create from an external source ▶  Import script"
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
          <Button
            disabled={files.length === 0 || isPending}
            icon={isPending ? "animatedWaiting" : "import"}
            rightIcon="next"
            onClick={handleInitImport}
          >
            Import
          </Button>
        </>
      }
    >
      Provide the script file(s) by either uploading it(/them) from disk or entering a URL to a
      remote location.
      <Admonition type="info">
        Supported formats: PDF, TXT.
        <br />
        Known sources: libre-theatre.fr, wikisource.com.
      </Admonition>
      {importError ? (
        <div
          role="alert"
          style={{ color: "var(--color-error)", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span>{importError}</span>
          <Button icon="redo" onClick={startOver}>
            Start over
          </Button>
        </div>
      ) : null}
      {initStatus === "error" ? (
        <div role="alert" style={{ color: "var(--color-error)" }}>
          Failed to start the import. Your files are still selected — you can try again.
        </div>
      ) : null}
      {step.name === "import" && step.processing ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <DotsLoader size="medium" />
          <span>Processing files… this can take a minute. You can stay on this page.</span>
        </div>
      ) : null}
      {uploadsPending > 0 ? (
        <div>
          Uploading files… ({uploadsDone}/{files.length})
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "10px",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <div>Selected script files: {files.length === 0 ? "none" : files.length}</div>
        {files.length === 0 ? null : (
          <ul
            style={{
              margin: "0",
              padding: "0",
              gap: "4px",
              listStyle: "none",
              alignSelf: "stretch",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {files.map((f, i) => (
              <li
                key={`${i}`.concat(f.type === "url" ? f.url : f.file.name)}
                style={{
                  margin: "0",
                  padding: "4px",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "var(--color-accent-a13)",
                  borderRadius: "10px",
                }}
                onMouseEnter={handleFileLineEnter(i)}
                onMouseLeave={handleFileLineLeave()}
              >
                <Icon
                  value="animatedWaiting"
                  mode="primary"
                  size="medium"
                  customClassNames={
                    i >= uploadsState.length || uploadsState[i].status !== "pending"
                      ? [styles.hidden]
                      : []
                  }
                />
                {i + 1}
                {". "}
                <span
                  style={{
                    flex: "1",
                  }}
                >
                  {f.type === "url" ? f.url : f.file.name}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "2px",
                  }}
                  className={classNames({
                    [styles.hidden]: scriptLineHovered !== i,
                  })}
                >
                  <Button
                    icon="asc"
                    disabled={i === 0 || isPending}
                    onClick={handleSelectedScriptMoveUp(i)}
                  />
                  <Button
                    icon="desc"
                    disabled={i === files.length - 1 || isPending}
                    onClick={handleSelectedScriptMoveDown(i)}
                  />
                  <Button
                    icon="delete"
                    onClick={handleSelectedScriptDelete(i)}
                    disabled={isPending}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            padding: "20px",
            border: "3px dashed #1f313C",
            borderRadius: "10px",
            alignSelf: "stretch",
            justifyContent: "center",
            background: dragOver ? "var(--color-accent-a13)" : "transparent",
            transition: "background 0.1s ease",
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleMouseLeave}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Icon value="dragNdrop" size="medium" mode="primary" />
            Drop files here
          </span>
          <span className={styles.or}>or</span>
          <Button icon="browseFiles" onClick={handleBrowseClick} disabled={isPending}>
            Browse your disk
          </Button>
          <span className={styles.or}>or</span>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "4px",
            }}
          >
            <input
              type="text"
              size={30}
              placeholder="Enter URL to remote file..."
              ref={inputURLRef}
            />
            <Button icon="next" onClick={handleURLButtonClick} disabled={isPending} />
          </div>
        </div>
        <input
          type="file"
          accept=".txt,.pdf"
          multiple={true}
          style={{ display: "none" }}
          ref={inputFromDiskRef}
          onChange={handleFileInputChange}
        />
      </div>
    </FlowStep>
  );
}

/** NameStep variant for the import flow: creates the play from the import result. */
function NameStepFromImport(props: {
  onBack: () => void;
  importId: string;
  metadata: ImportScriptMetadata;
}) {
  const trpc = useTRPC();
  const { user } = useUser();
  const { mutateAsync } = useMutation(trpc.plays.createFromImport.mutationOptions());
  const { mutateAsync: addToCollection } = useMutation(
    trpc.playsCollection.addToCollection.mutationOptions(),
  );
  const role = parseRole((user?.publicMetadata as { role?: unknown } | undefined)?.role);
  const canCreateCollectionPlay = hasCapability(role, "create_collection_play");
  return (
    <NamePlayStep
      onBack={props.onBack}
      metadata={props.metadata}
      allowAddToCommons={canCreateCollectionPlay}
      createPlay={(title) => mutateAsync({ title, importId: props.importId })}
      publishToCollection={(input) => addToCollection({ importId: props.importId, ...input })}
    />
  );
}

function ImportScriptFlow() {
  const { step, startOver, reviewDone, backToReview } = useImportScriptContext();
  switch (step.name) {
    case "import":
      return <ImportStep />;
    case "preview":
      return (
        <PreviewScriptStep
          scriptUri={step.importId}
          from="import"
          toolbar={<ImportScriptPreviewToolbar />}
          onBack={startOver}
          onReviewDone={reviewDone}
        />
      );
    case "name":
      return (
        <NameStepFromImport
          onBack={backToReview}
          importId={step.importId}
          metadata={step.metadata}
        />
      );
    default:
      assertUnreachable(step);
  }
}

function ImportScript() {
  return (
    <ImportScriptContextProvider>
      <ImportScriptFlow />
    </ImportScriptContextProvider>
  );
}

export default ImportScript;
