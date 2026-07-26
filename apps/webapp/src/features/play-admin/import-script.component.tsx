import classNames from 'classnames';
import { v4 as uuidv4 } from 'uuid';
import { Suspense, useEffect, useRef, useState, type DragEvent } from 'react';
import { NavLink, useNavigate } from 'react-router';
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
import { ToggleButton } from '../../components/toggle-button.component';
import { CardsSelect } from '../../components/cards-select.component';
import {
  ImportScriptContextProvider,
  useImportScriptContext,
} from './import-script.context';
import { useCollectionMetadataContext } from './collection-metadata.context';
import {
  ScriptTabToolbarContextProvider,
  useScriptTabToolbarContext,
} from '../script-edition/script-tab-toolbar.context';
import ScriptSearchPanel from '../script-edition/script-search-panel.component';
import ScriptNavigatePanel from '../script-edition/script-navigate-panel.component';
import ScriptCharactersPanel from '../script-edition/script-characters-panel.component';
import { ImportScriptPreviewToolbar } from './import-script-preview-toolbar';

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
  const { mutate, status: initStatus } = useMutation(
    trpc.plays.initImportScript.mutationOptions(),
  );
  const { step, importId } = useImportScriptContext();
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
  const {
    mutate: mutateUpload,
    reset: resetUpload,
    status: statusUpload,
  } = useMutation(opts);
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
  const handlePrevious = () => {
    navigate('/plays/new');
  };
  const isPending =
    initStatus === 'pending' ||
    statusUpload === 'pending' ||
    (step?.name === 'import' && step.processing);
  return (
    <FlowStep
      title="Create from an external source ▶  Import script"
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
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
  const {
    showSearchPanel,
    showNavigatePanel,
    showCharactersPanel,
    setShowSearchPanel,
    setShowNavigatePanel,
    setShowCharactersPanel,
  } = useScriptTabToolbarContext();
  const showPanels =
    showSearchPanel || showNavigatePanel || showCharactersPanel;
  const handleCloseSearchPanel = () => {
    setShowSearchPanel(false);
  };
  const handleCloseNavigatePanel = () => {
    setShowNavigatePanel(false);
  };
  const handleCloseCharactersPanel = () => {
    setShowCharactersPanel(false);
  };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
      }}
    >
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
        You can review the import result to make sure there isn't a massive
        issue before creating the project.
        <br /> (i.e. entire sections missing or in wrong order). You'll be able
        to modify the script later.
        <Script isEditable={false} scriptContext={previewScriptContext} />
      </FlowStep>
      {showPanels ? (
        <div className={styles.panelsContainer}>
          {showSearchPanel ? (
            <ScriptSearchPanel onClose={handleCloseSearchPanel} />
          ) : null}
          {showNavigatePanel ? (
            <ScriptNavigatePanel
              onClose={handleCloseNavigatePanel}
              outline={previewScriptContext?.outline ?? []}
            />
          ) : null}
          {showCharactersPanel ? (
            <ScriptCharactersPanel
              onClose={handleCloseCharactersPanel}
              characters={previewScriptContext?.characters ?? {}}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface NameStepProps {
  onBack: () => void;
  importId: string;
  metadata: ImportScriptMetadata;
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
  const [addToCommonsLib, setAddToCommonsLib] = useState(false);
  const { genres, periods } = useCollectionMetadataContext();
  const handleToggleAddToCommons = () => {
    setAddToCommonsLib((prev) => !prev);
  };
  const flowTitle = addToCommonsLib
    ? 'Create from an external source ▶ Add details to public play'
    : 'Create from an external source ▶ Name your new play';
  return (
    <>
      <Admonition type="info" title="Administator commands">
        <ToggleButton
          label="Add to commons library"
          onToggle={handleToggleAddToCommons}
          value={false}
        />
      </Admonition>
      <FlowStep
        title={flowTitle}
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
        {addToCommonsLib ? (
          <>
            <div className={styles.row}>
              <label>Title</label>
              <input
                placeholder=""
                ref={titleInputRef}
                type="text"
                size={60}
                maxLength={100}
                onChange={handleTitleChange}
                value={props.metadata.title}
              />
            </div>
            <div className={styles.row}>
              <label>Author</label>
              <input
                type="text"
                size={60}
                maxLength={100}
                value={props.metadata.author}
              />
            </div>
            <div className={styles.row}>
              <label>Language</label>
              <CardsSelect
                value={props.metadata.language}
                options={[
                  {
                    label: 'FR',
                    value: 'fr',
                  },
                  {
                    label: 'EN',
                    value: 'en',
                  },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Number of roles</label>
              <CardsSelect
                value={'' + props.metadata.number_of_roles}
                options={[
                  {
                    label: '1',
                    value: '1',
                  },
                  {
                    label: '2',
                    value: '2',
                  },
                  {
                    label: '3',
                    value: '3',
                  },
                  {
                    label: '4',
                    value: '4',
                  },
                  {
                    label: '5',
                    value: '5',
                  },
                  {
                    label: '6',
                    value: '6',
                  },
                  {
                    label: '7',
                    value: '7',
                  },
                  {
                    label: '8',
                    value: '8',
                  },
                  {
                    label: '9',
                    value: '9',
                  },
                  {
                    label: '10',
                    value: '10',
                  },
                  {
                    label: '11',
                    value: '11',
                  },
                  {
                    label: '12',
                    value: '12',
                  },
                  {
                    label: '13',
                    value: '13',
                  },
                  {
                    label: '14',
                    value: '14',
                  },
                  {
                    label: '15',
                    value: '15',
                  },
                  {
                    label: '16',
                    value: '16',
                  },
                  {
                    label: '17',
                    value: '17',
                  },
                  {
                    label: '18',
                    value: '18',
                  },
                  {
                    label: '19',
                    value: '19',
                  },
                  {
                    label: '20',
                    value: '20',
                  },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Number of male roles</label>
              <CardsSelect
                value={String(props.metadata.number_of_male_roles)}
                options={[
                  {
                    label: '1',
                    value: '1',
                  },
                  {
                    label: '2',
                    value: '2',
                  },
                  {
                    label: '3',
                    value: '3',
                  },
                  {
                    label: '4',
                    value: '4',
                  },
                  {
                    label: '5',
                    value: '5',
                  },
                  {
                    label: '6',
                    value: '6',
                  },
                  {
                    label: '7',
                    value: '7',
                  },
                  {
                    label: '8',
                    value: '8',
                  },
                  {
                    label: '9',
                    value: '9',
                  },
                  {
                    label: '10',
                    value: '10',
                  },
                  {
                    label: '11',
                    value: '11',
                  },
                  {
                    label: '12',
                    value: '12',
                  },
                  {
                    label: '13',
                    value: '13',
                  },
                  {
                    label: '14',
                    value: '14',
                  },
                  {
                    label: '15',
                    value: '15',
                  },
                  {
                    label: '16',
                    value: '16',
                  },
                  {
                    label: '17',
                    value: '17',
                  },
                  {
                    label: '18',
                    value: '18',
                  },
                  {
                    label: '19',
                    value: '19',
                  },
                  {
                    label: '20',
                    value: '20',
                  },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Number of female roles</label>
              <CardsSelect
                value={'' + props.metadata.number_of_female_roles}
                options={[
                  {
                    label: '1',
                    value: '1',
                  },
                  {
                    label: '2',
                    value: '2',
                  },
                  {
                    label: '3',
                    value: '3',
                  },
                  {
                    label: '4',
                    value: '4',
                  },
                  {
                    label: '5',
                    value: '5',
                  },
                  {
                    label: '6',
                    value: '6',
                  },
                  {
                    label: '7',
                    value: '7',
                  },
                  {
                    label: '8',
                    value: '8',
                  },
                  {
                    label: '9',
                    value: '9',
                  },
                  {
                    label: '10',
                    value: '10',
                  },
                  {
                    label: '11',
                    value: '11',
                  },
                  {
                    label: '12',
                    value: '12',
                  },
                  {
                    label: '13',
                    value: '13',
                  },
                  {
                    label: '14',
                    value: '14',
                  },
                  {
                    label: '15',
                    value: '15',
                  },
                  {
                    label: '16',
                    value: '16',
                  },
                  {
                    label: '17',
                    value: '17',
                  },
                  {
                    label: '18',
                    value: '18',
                  },
                  {
                    label: '19',
                    value: '19',
                  },
                  {
                    label: '20',
                    value: '20',
                  },
                ]}
              />
            </div>
            <div className={styles.row}>
              <label>Genre</label>
              <CardsSelect
                value={props.metadata.genre}
                options={genres.map((genre) => ({
                  label: genre,
                  value: genre,
                }))}
              />
            </div>
            <div className={styles.row}>
              <label>Period</label>
              <CardsSelect
                value={props.metadata.period}
                options={periods.map((period) => ({
                  label: period,
                  value: period,
                }))}
              />
            </div>
            <div className={styles.row}>
              <label>Synopsys</label>
              <textarea rows={10} />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </FlowStep>
    </>
  );
}

function ImportScriptFlow() {
  const { step, startOver, reviewDone, backToReview } =
    useImportScriptContext();
  if (!step) {
    return <DotsLoader size="xlarge" />;
  }
  switch (step.name) {
    case 'import':
      return <ImportStep />;
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
              <ScriptTabToolbarContextProvider>
                <ImportScriptPreviewToolbar />
                <PreviewStep onBack={startOver} onReviewDone={reviewDone} />
              </ScriptTabToolbarContextProvider>
            </ScriptContextProvider>
          </Suspense>
        </ErrorBoundary>
      );
    case 'name':
      return (
        <NameStep
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
