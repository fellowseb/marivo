import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import Button from '../../components/button.component';
import { useTRPC } from '../../trpc';
import Admonition from '../../components/admonition.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';
import FlowStep from '../../components/flow-step.component';

export function NewEmptyScriptBreadcrumbs() {
  return (
    <HeaderBreadcrumbs
      key="new-empty-script"
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
            pathname: '/plays/new/empty',
          }}
        >
          Empty script
        </NavLink>,
      ]}
    />
  );
}

function NewEmptyScript() {
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
  const handlePrevious = () => {
    navigate('/plays/new');
  };
  return (
    <FlowStep
      title="Create ▶  Name your play"
      Actions={
        <>
          <Button icon="previous" onClick={handlePrevious} />
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

export default NewEmptyScript;
