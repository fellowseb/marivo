import classNames from 'classnames';
import { v4 as uuidv4 } from 'uuid';
import { Suspense, useEffect, useRef, useState, type DragEvent } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../trpc';
import Button from '../../components/button.component';
import Icon from '../../components/icon.component';
import FlowStep from '../../components/flow-step.component';
import Admonition from '../../components/admonition.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import DotsLoader from '../../components/dots-loader.component';
import PageNotFound from '../../components/page-not-found.component';
import ErrorBoundary from '../../components/error-boundary.component';
import styles from './import-script.module.css';
import { assertUnreachable } from '@marivo/utils';
import Script from '../script/script.component';
import {
  ScriptContextProvider,
  useScriptContext,
} from '../script/script.context';

type ScriptImportFile =
  | {
      id: string;
      type: 'url';
      url: string;
    }
  | {
      id: string;
      type: 'file';
      file: File;
    };

export function ImportScriptBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New play
        </NavLink>,
        <NavLink
          to={{
            pathname: '/plays/new/import',
          }}
        >
          Import script
        </NavLink>,
      ]}
    />
  );
}

interface ImportStepProps {
  onImportDone: (importId: string) => void;
}

function ImportStep(props: ImportStepProps) {
  const trpc = useTRPC();
  const [importId] = useState(uuidv4());
  const {
    mutate,
    isPending: isInitPending,
    status: initStatus,
  } = useMutation(trpc.plays.initImportScript.mutationOptions());
  const statusQry = trpc.plays.importScriptStatus.queryOptions({
    importId,
  });
  statusQry.enabled = () => {
    return Boolean(importId && initStatus === 'success');
  };
  statusQry.refetchInterval = 5000;
  const { status: statusStatus, data: statusData } = useQuery(statusQry);
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
  const { mutate: mutateUpload, reset: resetUpload } = useMutation(opts);
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
    setFiles((files) => {
      const fileListCount = inputFromDiskRef.current?.files?.length ?? 0;
      const f: ScriptImportFile[] = [];
      for (let index = 0; index < fileListCount; index++) {
        const fi = inputFromDiskRef.current?.files?.item(index);
        if (fi) {
          f.push({
            id: uuidv4(),
            type: 'file',
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
  const handleInitImport = () => {
    resetUpload();
    mutate({
      importId,
      files: files.map((f) => {
        return f.type === 'url'
          ? f
          : {
              id: f.id,
              type: 'file',
              name: f.file.name,
              size: f.file.size,
            };
      }),
    });
  };
  const [scriptLineHovered, setScriptLineHovered] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (initStatus === 'success') {
      files.forEach((entry) => {
        if (entry.type === 'file') {
          (entry.file as any).id = entry.id;
          mutateUpload(entry.file);
        }
      });
    }
  }, [initStatus]);
  const isPending =
    isInitPending ||
    uploadsState.some((state) => state.status === 'pending') ||
    (statusStatus === 'success' &&
      ['uploading_files', 'processing_files'].includes(statusData.status));
  const isDone =
    initStatus === 'success' &&
    uploadsState.some((state) => state.status === 'success') &&
    statusStatus === 'success' &&
    statusData.status === 'reviewing';
  useEffect(() => {
    if (isDone) {
      props.onImportDone(importId);
    }
  }, [isDone]);
  const handleFileLineEnter = (i: number) => () => {
    setScriptLineHovered(i);
  };
  const handleFileLineLeave = () => () => {
    setScriptLineHovered(null);
  };
  const handleURLButtonClick = () => {
    setFiles((files) => {
      const url = inputURLRef.current?.value;
      if (!url) {
        return files;
      }
      return files.concat({
        id: uuidv4(),
        type: 'url',
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
              type: 'file',
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
  return (
    <FlowStep
      title="Create from an external source ▶  Import script"
      Actions={
        <>
          <Button
            disabled={files.length === 0 || isPending}
            icon={isPending ? 'animatedWaiting' : 'import'}
            rightIcon="next"
            onClick={handleInitImport}
          >
            Import
          </Button>
        </>
      }
    >
      Provide the script file(s) by either uploading it(/them) from disk or
      entering a URL to a remote location.
      <Admonition type="info">
        Supported formats: PDF, TXT.
        <br />
        Known sources: libre-theatre.fr, wikisource.com.
      </Admonition>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '10px',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div>
          Selected script files: {files.length === 0 ? 'none' : files.length}
        </div>
        {files.length === 0 ? null : (
          <ul
            style={{
              margin: '0',
              padding: '0',
              gap: '4px',
              listStyle: 'none',
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {files.map((f, i) => (
              <li
                key={`${i}`.concat(f.type === 'url' ? f.url : f.file.name)}
                style={{
                  margin: '0',
                  padding: '4px',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#1f313C22',
                  borderRadius: '10px',
                }}
                onMouseEnter={handleFileLineEnter(i)}
                onMouseLeave={handleFileLineLeave()}
              >
                <Icon
                  value="animatedWaiting"
                  mode="primary"
                  size="medium"
                  customClassNames={
                    i >= uploadsState.length ||
                    uploadsState[i].status !== 'pending'
                      ? [styles.hidden]
                      : []
                  }
                />
                {i + 1}
                {'. '}
                <span
                  style={{
                    flex: '1',
                  }}
                >
                  {f.type === 'url' ? f.url : f.file.name}
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '2px',
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '20px',
            border: '3px dashed #1f313C',
            borderRadius: '10px',
            alignSelf: 'stretch',
            justifyContent: 'center',
            background: dragOver ? '#1f313C22' : 'transparent',
            transition: 'background 0.1s ease',
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleMouseLeave}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon value="dragNdrop" size="medium" mode="primary" />
            Drop files here
          </span>
          <span className={styles.or}>or</span>
          <Button
            icon="browseFiles"
            onClick={handleBrowseClick}
            disabled={isPending}
          >
            Browse your disk
          </Button>
          <span className={styles.or}>or</span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
            }}
          >
            <input
              type="text"
              size={30}
              placeholder="Enter URL to remote file..."
              ref={inputURLRef}
            />
            <Button
              icon="next"
              onClick={handleURLButtonClick}
              disabled={isPending}
            />
          </div>
        </div>
        <input
          type="file"
          accept=".txt,.pdf"
          multiple={true}
          style={{ display: 'none' }}
          ref={inputFromDiskRef}
          onChange={handleFileInputChange}
        />
      </div>
    </FlowStep>
  );
}

interface PreviewStepProps {
  onReviewDone: () => void;
  onBack: () => void;
}

function PreviewStep(props: PreviewStepProps) {
  const previewScriptContext = useScriptContext();
  return (
    <FlowStep
      title="Create from an external source ▶  Preview script"
      Actions={
        <>
          <Button icon="previous" onClick={props.onBack} />
          <Button rightIcon="next" onClick={props.onReviewDone}>
            Done
          </Button>
        </>
      }
      growVertically={true}
    >
      You can review the import result to make sure there isn't a massive issue
      before creating the project.
      <br /> (i.e. entire sections missing or in wrong order). You'll be able to
      modify the script later.
      <div
        style={{
          overflowY: 'scroll',
          flex: '1 1 0',
        }}
      >
        <Script isEditable={false} scriptContext={previewScriptContext} />
      </div>
    </FlowStep>
  );
}

interface NameStepProps {
  onBack: () => void;
  importId: string;
}

function NameStep(props: NameStepProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [createReady, setCreateReady] = useState(false);
  const handleTitleChange = () => {
    setCreateReady((titleInputRef.current?.value ?? '').length > 0);
  };
  const trpc = useTRPC();
  const { mutate, isPending, isSuccess, data } = useMutation(
    trpc.plays.createFromImport.mutationOptions(),
  );
  const navigate = useNavigate();
  const handleCreate = () => {
    const title = titleInputRef.current?.value ?? 'New play';
    mutate({ title, importId: props.importId });
  };
  const [createdUri, setCreatedUri] = useState<string | null>(null);
  const queryOpts = trpc.plays.playDetails.queryOptions({
    uri: createdUri ?? '',
  });
  queryOpts.enabled = !!createdUri;
  const {
    isSuccess: isQuerySuccess,
    isPending: isQueryPending,
    isEnabled: isQueryEnabled,
  } = useQuery(queryOpts);
  useEffect(() => {
    if (isSuccess && data?.uri) {
      setCreatedUri(data.uri);
    }
  }, [isSuccess, data?.uri]);
  useEffect(() => {
    if (isQuerySuccess) {
      navigate({
        pathname: `/plays/edit/${createdUri}`,
      });
    }
  }, [isQuerySuccess, createdUri]);
  return (
    <FlowStep
      title="Create from an external source ▶  Name your new play"
      Actions={
        <>
          <Button icon="previous" onClick={props.onBack} />
          <Button
            disabled={!createReady}
            icon={
              isPending || (isQueryPending && isQueryEnabled)
                ? 'animatedWaiting'
                : 'newPlay'
            }
            onClick={handleCreate}
          >
            Create
          </Button>
        </>
      }
    >
      Give a name to your project.
      <Admonition type="info">
        This name doesn't need to correspond to the title of the play. For
        instance you might also want to indicate the name of the troupe or
        company, and maybe the year.
        <br />
        You'll be able to change it later on !
      </Admonition>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        <label>Project name</label>
        <input
          placeholder="Othello - Shakespeare (Troupe Name / 2026)"
          ref={titleInputRef}
          type="text"
          size={60}
          maxLength={100}
          onChange={handleTitleChange}
        />
      </div>
    </FlowStep>
  );
}

type Step =
  | {
      name: 'import';
    }
  | { name: 'preview'; importId: string }
  | { name: 'name'; importId: string };

function ImportScript() {
  const [searchParams] = useSearchParams();
  const resumeImportId = searchParams.get('resume');
  const [step, setStep] = useState<Step>(() => {
    if (resumeImportId) {
      return { name: 'preview', importId: resumeImportId };
    }
    return { name: 'import' };
  });
  const handleImportDone = (importId: string) => {
    setStep((prev) => {
      if (prev.name !== 'import') {
        return prev;
      }
      return {
        name: 'preview',
        importId,
      };
    });
  };
  const handleReviewBack = () => {
    setStep((prev) => {
      if (prev.name !== 'preview') {
        return prev;
      }
      return {
        name: 'import',
      };
    });
  };
  const handleReviewDone = () => {
    setStep((prev) => {
      if (prev.name !== 'preview') {
        return prev;
      }
      return {
        name: 'name',
        importId: prev.importId,
      };
    });
  };
  const handleNameBack = () => {
    setStep((prev) => {
      if (prev.name !== 'name') {
        return prev;
      }
      return {
        name: 'preview',
        importId: prev.importId,
      };
    });
  };
  switch (step.name) {
    case 'import':
      return <ImportStep onImportDone={handleImportDone} />;
    case 'preview':
      return (
        <ErrorBoundary fallback={<PageNotFound />}>
          <Suspense
            fallback={
              <div
                style={{
                  flex: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DotsLoader size="xlarge" />
              </div>
            }
          >
            <ScriptContextProvider uri={step.importId} from="import">
              <PreviewStep
                onBack={handleReviewBack}
                onReviewDone={handleReviewDone}
              />
            </ScriptContextProvider>
          </Suspense>
        </ErrorBoundary>
      );
    case 'name':
      return <NameStep onBack={handleNameBack} importId={step.importId} />;
    default:
      assertUnreachable(step);
  }
}

export default ImportScript;
