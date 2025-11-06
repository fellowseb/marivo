import { NavLink, useNavigate } from 'react-router';
import styles from './new-play-page.module.css';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import Button from '../../components/button.components';
import Tabs from '../../components/tabs.component';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/icon.component';
import { useTRPC } from '../../trpc';
import { useMutation, useQuery } from '@tanstack/react-query';

export function NewPlayPageBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-play"
      crumbs={[
        <NavLink
          to={{
            pathname: '/plays',
          }}
        >
          My plays
        </NavLink>,
        <NavLink
          to={{
            pathname: '/plays/new',
          }}
        >
          New
        </NavLink>,
      ]}
    />
  );
}

// <p>
//   Use Marivo has the main script
//   editor
//   Enjoy collaborating in a minimalistic editing environment with all the
//   features needed:
//   <ul>
//     <li>
//       controlled format for title / sections / line authors /
//       didascalies
//     </li>
//     <li>full undo/redo history</li>
//     <li>version control of lines</li>
//     <li>capability to attach comments/staging directions</li>
//     <li>share draft versions to let the Staging Director validate</li>
//   </ul>
// </p>

type SectionChoice = 'choice-1' | 'choice-2' | 'choice-3';

function ImportFromDiskTab() {
  return (
    <div
      style={{
        display: 'grid',
        padding: '2ch',
        gap: '4px',
        gridTemplateColumns: '100px auto',
        alignItems: 'center',
      }}
    >
      <label>File</label>
      <input type="file" />
    </div>
  );
}

function ImportFromExternalSourceTab() {
  return (
    <div
      style={{
        display: 'grid',
        padding: '2ch',
        gap: '10px',
        gridTemplateColumns: '100px auto',
        alignItems: 'center',
      }}
    >
      <label>URL</label>
      <input type="text" />
      <label></label>
      <div
        style={{
          gap: '4px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <label
          style={{
            display: 'flex',
            gap: '10px',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <input type="checkbox" />
          Keep as source of truth
        </label>
        <div
          style={{
            marginTop: '4px',
          }}
        >
          With this option the script will be kept in read-only mode in Marivo
          and synced up regularly with the Cloud source.
        </div>
      </div>
      <div
        style={{
          gridColumnStart: 1,
          gridColumnEnd: 3,
          alignItems: 'center',
          flexDirection: 'column',
          display: 'flex',
        }}
      >
        <Button disabled={true} icon="downloadCloud">
          Import
        </Button>
      </div>
    </div>
  );
}

function Choice1() {
  return (
    <>
      <p>1. Import the script</p>
      <Tabs
        tabs={[
          {
            name: (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  flexDirection: 'row',
                }}
              >
                <Icon value="web" size="medium" mode="primary" />
                From a Cloud provider
              </div>
            ),
            ContentComponent: <ImportFromExternalSourceTab />,
          },
          {
            name: (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  flexDirection: 'row',
                }}
              >
                <Icon value="hardDrive" size="medium" mode="primary" />
                From disk
              </div>
            ),
            ContentComponent: <ImportFromDiskTab />,
          },
        ]}
      />
      <p>2. Review the import result</p>
      <Tabs
        tabs={[
          {
            name: 'Stats',
            ContentComponent: (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px auto',
                  padding: '1rem',
                }}
              >
                <span>Number of lines</span>
                <span>2424</span>
                <span>Number of characters</span>
                <span>4</span>
                <span>Number of didascalies</span>
                <span>324</span>
              </div>
            ),
          },
          {
            name: 'Characters',
            ContentComponent: <div />,
          },
          {
            name: 'Errors',
            ContentComponent: <div />,
          },
          {
            name: 'Preview',
            ContentComponent: <div />,
          },
        ]}
      />
      <p>3. Give a title to your project</p>
      <div
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          display: 'flex',
          gap: '4px',
        }}
      >
        <label
          style={{
            width: '100px',
          }}
        >
          Title
        </label>
        <input type="text" size={60} />
      </div>
    </>
  );
}

function Choice3(props: { onGoBack: () => void }) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [createReady, setCreateReady] = useState(false);
  const handleTitleChange = () => {
    setCreateReady((titleInputRef.current?.value ?? '').length > 0);
  };
  const trpc = useTRPC();
  const { mutate, isPending, isSuccess, data } = useMutation(
    trpc.plays.create.mutationOptions(),
  );
  const navigate = useNavigate();
  const handleCreate = () => {
    const title = titleInputRef.current?.value ?? 'New play';
    mutate({ title });
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
    <>
      <p>Give a title to your project</p>
      <div
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          display: 'flex',
          gap: '4px',
        }}
      >
        <label
          style={{
            width: '100px',
          }}
        >
          Title
        </label>
        <input
          ref={titleInputRef}
          type="text"
          size={60}
          onChange={handleTitleChange}
        />
      </div>
      <div
        className={classNames({
          [styles.hidden]: false,
          [styles.actions]: true,
        })}
      >
        <Button
          customClassNames={[styles.actionBack]}
          onClick={props.onGoBack}
          icon="previous"
        ></Button>
        <Button
          disabled={!createReady}
          icon={
            isPending || (isQueryPending && isQueryEnabled)
              ? 'animatedWaiting'
              : 'new'
          }
          onClick={handleCreate}
        >
          Create
        </Button>
      </div>
    </>
  );
}

export function NewPlayPage() {
  const [choiceForAnim, setChoiceForAnim] = useState<SectionChoice | null>(
    null,
  );
  const [choice, setChoice] = useState<SectionChoice | null>(null);
  const makeHandleSectionClick = (c: SectionChoice) => () => {
    setChoiceForAnim(c);
    const timeoutId = setTimeout(() => {
      setChoice(c);
    }, 300);
    return () => {
      clearTimeout(timeoutId);
    };
  };
  const handleBack = () => {
    setChoice(null);
    setChoiceForAnim(null);
  };
  return (
    <div className={styles.container}>
      <section
        className={classNames({
          [styles.section]: true,
          [styles.hidden]: choice && choice !== 'choice-1',
          [styles.removed]: choiceForAnim && choiceForAnim !== 'choice-1',
        })}
        onClick={makeHandleSectionClick('choice-1')}
      >
        <div className={styles.desc}>Import an existing script</div>
        <img src="/src/assets/empty-script.svg" width={120} />
        <div
          className={classNames({
            [styles.content]: true,
            [styles.hidden]: choice !== 'choice-1',
          })}
        >
          <Choice1 />
        </div>
      </section>
      <section
        className={classNames({
          [styles.section]: true,
          [styles.hidden]: choice && choice !== 'choice-2',
          [styles.removed]: choiceForAnim && choiceForAnim !== 'choice-2',
        })}
        onClick={makeHandleSectionClick('choice-2')}
      >
        <div className={styles.desc}>
          Pick from a collection of scripts in the Public Domain.
        </div>
        <img src="/src/assets/empty-script.svg" width={120} />
      </section>
      <section
        className={classNames({
          [styles.section]: true,
          [styles.hidden]: choice && choice !== 'choice-3',
          [styles.removed]: choiceForAnim && choiceForAnim !== 'choice-3',
        })}
        onClick={makeHandleSectionClick('choice-3')}
      >
        <div className={styles.desc}>Start with an empty script</div>
        <img src="/src/assets/empty-script.svg" width={120} />
        <div
          className={classNames({
            [styles.content]: true,
            [styles.hidden]: choice !== 'choice-3',
          })}
        >
          <Choice3 onGoBack={handleBack} />
        </div>
      </section>
    </div>
  );
}

export default NewPlayPage;
