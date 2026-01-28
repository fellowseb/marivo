import { useRef, useState } from 'react';
import { NavLink } from 'react-router';
import Button from '../../components/button.component';
import Tabs from '../../components/tabs.component';
import Icon from '../../components/icon.component';
import FlowStep from '../../components/flow-step.component';
import Admonition from '../../components/admonition.component';
import { HeaderBreadcrumbs } from '../../layouts/header.component';

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

function ImportFromDiskTab() {
  const [importEnabled, setImportEnabled] = useState(false);
  const inputFromDiskRef = useRef<HTMLInputElement>(null);
  const handleFileInputChange = () => {
    setImportEnabled(Boolean(inputFromDiskRef.current?.value));
  };
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
      <input
        type="file"
        ref={inputFromDiskRef}
        onChange={handleFileInputChange}
      />
      <div
        style={{
          gridColumnStart: 1,
          gridColumnEnd: 3,
          alignItems: 'center',
          flexDirection: 'column',
          display: 'flex',
        }}
      >
        <Button disabled={!importEnabled} icon="downloadFile">
          Import
        </Button>
      </div>
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
      ></div>
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

function ImportScript() {
  return (
    <FlowStep
      title="Import from an external source"
      Actions={
        <>
          <Button icon="next" iconSide="right" disabled={true}>
            Next
          </Button>
        </>
      }
    >
      Provide the script file by either uploading it from disk or entering a URL
      to a remote location.
      <Admonition type="info">
        Supported formats: PDF, TXT.
        <br />
        Known sources: libre-theatre.fr, wikisource.com.
      </Admonition>
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
                <Icon value="hardDrive" size="medium" mode="primary" />
                From disk
              </div>
            ),
            ContentComponent: <ImportFromDiskTab />,
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
                <Icon value="web" size="medium" mode="primary" />
                From a remote server
              </div>
            ),
            ContentComponent: <ImportFromExternalSourceTab />,
          },
        ]}
      />
    </FlowStep>
  );
}

export default ImportScript;
