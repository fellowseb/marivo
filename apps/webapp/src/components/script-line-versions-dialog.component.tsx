import { type KeyboardEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from './button.component';
import { Dialog } from './dialog.component';
import ScriptLine from './script-line.component';
import type { Line, LineContent, LineInfo } from './script.models';
import styles from './script-line-versions-dialog.module.css';
import { usePlayContext } from '../features/play-admin/play.context';
import CollapsibleSection from './collapsible-section.component';
import classNames from 'classnames';

interface LineVersionHeaderProps {
  collapsed: boolean;
  authorUsername: string;
  participants: { [username: string]: { fullName: string } };
  lastModifiedDate: Date;
}

const Header = ({
  authorUsername,
  participants,
  lastModifiedDate,
  collapsed,
}: LineVersionHeaderProps) => {
  return (
    <div className={styles.lineVersionHeader}>
      <div
        className={classNames({
          [styles.lineVersionHeaderArrowCollapsed]: collapsed,
          [styles.lineVersionHeaderArrowExpanded]: !collapsed,
        })}
      >
        ▶
      </div>
      <span>
        By{' '}
        <strong>
          {authorUsername
            ? `${participants[authorUsername].fullName ?? ''} (@${authorUsername})`
            : 'Someone'}
        </strong>
        , {formatDistanceToNow(lastModifiedDate)} ago
      </span>
    </div>
  );
};

interface LineVersionProps {
  participants: { [username: string]: { fullName: string } };
  content: LineContent;
  line: Line;
  lineInfo: LineInfo;
  characters: { [id: string]: string };
}

function LineVersion(props: LineVersionProps) {
  const {
    participants,
    content: { authorUsername, lastModifiedDate },
  } = props;
  return (
    <CollapsibleSection
      Header={
        <Header
          participants={participants}
          authorUsername={authorUsername}
          lastModifiedDate={lastModifiedDate}
          collapsed={true}
        />
      }
      HeaderExpanded={
        <Header
          participants={participants}
          authorUsername={authorUsername}
          lastModifiedDate={lastModifiedDate}
          collapsed={false}
        />
      }
    >
      <div>
        <div className={styles.lineVersionContent}>
          <ScriptLine
            line={props.line}
            num={0}
            content={props.content}
            lineInfo={props.lineInfo}
            isEditable={false}
            characters={props.characters}
          />
        </div>
        <div className={styles.lineVersionActions}>
          <Button icon="accept">Apply as new version</Button>
          <Button icon="delete">Delete</Button>
        </div>
      </div>
    </CollapsibleSection>
  );
}

interface ScriptLineVersionsDialogProps {
  onOK: () => void;
  onApplyDraft?: () => void;
  onApplyDraftAsNewVersion?: () => void;
  line: Line;
  lineInfo: LineInfo;
  currentContent: LineContent;
  sharedDraftContents: LineContent[];
  previousVersionsContents: LineContent[];
  lineNum: number;
  characters: { [id: string]: string };
}

export function ScriptLineVersionsDialog(props: ScriptLineVersionsDialogProps) {
  const playResult = usePlayContext();
  const handleOkClick = () => {
    props.onOK();
  };
  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      props.onOK();
    }
  };
  if (!playResult) {
    return null;
  }
  return (
    <Dialog
      title={`${props.line.type === 'heading' ? 'Heading' : props.line.type === 'chartext' ? 'Cue' : 'Freetext'} line versions`}
      actions={
        <Button icon="accept" onClick={handleOkClick} autoFocus={true}>
          OK
        </Button>
      }
      onKeyUp={handleKeyUp}
      customClassNames={[styles.dialog]}
    >
      <div className={styles.currentContentContainer}>
        <h2 className={styles.sectionTitle}>Current version</h2>
        <LineVersion
          participants={playResult.dataOrThrow().participants}
          content={props.currentContent}
          characters={props.characters}
          lineInfo={props.lineInfo}
          line={props.line}
        />
      </div>
      <div className={styles.currentContentContainer}>
        <h2 className={styles.sectionTitle}>Previous versions</h2>
        {(props.previousVersionsContents?.length ?? 0 > 0) ? (
          props.previousVersionsContents.map((sharedContent) => {
            return (
              <LineVersion
                participants={playResult.dataOrThrow().participants}
                content={sharedContent}
                characters={props.characters}
                lineInfo={props.lineInfo}
                line={props.line}
              />
            );
          })
        ) : (
          <span>No previous versions</span>
        )}
      </div>
      <div className={styles.currentContentContainer}>
        <h2 className={styles.sectionTitle}>Shared drafts</h2>
        {(props.sharedDraftContents?.length ?? 0 > 0) ? (
          props.sharedDraftContents.map((sharedContent) => {
            return (
              <LineVersion
                participants={playResult.dataOrThrow().participants}
                content={sharedContent}
                characters={props.characters}
                lineInfo={props.lineInfo}
                line={props.line}
              />
            );
          })
        ) : (
          <span>No shared drafts</span>
        )}
      </div>
    </Dialog>
  );
}
