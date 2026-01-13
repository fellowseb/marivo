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
  version: number | null;
}

const Header = ({
  authorUsername,
  participants,
  lastModifiedDate,
  collapsed,
  version,
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
        {version != null ? `v${version} by ` : `by `}
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
  onApplyAsNewVersion?: () => void;
  onDelete?: () => void;
  participants: { [username: string]: { fullName: string } };
  content: LineContent;
  line: Line;
  lineInfo: LineInfo;
  characters: { [id: string]: string };
  hideActions?: boolean;
  collapsed?: boolean;
}

function LineVersion(props: LineVersionProps) {
  const {
    participants,
    content: { authorUsername, lastModifiedDate, version },
  } = props;
  const handleApplyAsNewVersionClick = () => {
    props.onApplyAsNewVersion?.();
  };
  const handleDeleteClick = () => {
    props.onDelete?.();
  };
  return (
    <CollapsibleSection
      Header={
        <Header
          participants={participants}
          authorUsername={authorUsername}
          lastModifiedDate={lastModifiedDate}
          collapsed={true}
          version={version}
        />
      }
      HeaderExpanded={
        <Header
          participants={participants}
          authorUsername={authorUsername}
          lastModifiedDate={lastModifiedDate}
          collapsed={false}
          version={version}
        />
      }
      collapsed={props.collapsed}
    >
      <div className={styles.lineVersionContent}>
        <ScriptLine
          line={props.line}
          content={props.content}
          lineInfo={props.lineInfo}
          isEditable={false}
          characters={props.characters}
        />
        {!props.hideActions ? (
          <div className={styles.lineVersionActions}>
            <Button icon="accept" onClick={handleApplyAsNewVersionClick}>
              Apply as new version
            </Button>
            <Button icon="delete" onClick={handleDeleteClick}>
              Delete
            </Button>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

interface ScriptLineVersionsDialogProps {
  onOK: () => void;
  onApplyPreviousVersionAsNewVersion?: (previousVersion: LineContent) => void;
  onDeletePreviousVersion?: (contentId: string) => void;
  onApplySharedDraftAsNewVersion?: (sharedDraft: LineContent) => void;
  onDeleteSharedDraft?: (contentId: string) => void;
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
  const handleApplyPreviousVersionAsNewVersion =
    (previousVersion: LineContent) => () => {
      props.onApplyPreviousVersionAsNewVersion?.(previousVersion);
    };
  const handleDeletePreviousVersion = (contentId: string) => () => {
    props.onDeletePreviousVersion?.(contentId);
  };
  const handleApplySharedDraftAsNewVersion =
    (sharedDraft: LineContent) => () => {
      props.onApplySharedDraftAsNewVersion?.(sharedDraft);
    };
  const handleDeleteSharedDraft = (contentId: string) => () => {
    props.onDeleteSharedDraft?.(contentId);
  };
  if (!playResult) {
    return null;
  }
  const sortedSharedDrafts = props.sharedDraftContents.sort(
    (lhs, rhs) =>
      rhs.lastModifiedDate.getTime() - lhs.lastModifiedDate.getTime(),
  );
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
      <h2 className={styles.sectionTitle}>Current version</h2>
      <div
        className={classNames([
          styles.contentContainer,
          styles.currentContentContainer,
        ])}
      >
        <LineVersion
          participants={playResult.dataOrThrow().participants}
          content={props.currentContent}
          characters={props.characters}
          lineInfo={props.lineInfo}
          line={props.line}
          hideActions={true}
          collapsed={false}
        />
      </div>
      <h2 className={styles.sectionTitle}>Previous versions</h2>
      <div className={styles.contentContainer}>
        {(props.previousVersionsContents?.length ?? 0 > 0) ? (
          props.previousVersionsContents.map((sharedContent) => {
            return (
              <LineVersion
                key={sharedContent.id}
                participants={playResult.dataOrThrow().participants}
                content={sharedContent}
                characters={props.characters}
                lineInfo={props.lineInfo}
                line={props.line}
                onApplyAsNewVersion={handleApplyPreviousVersionAsNewVersion(
                  sharedContent,
                )}
                onDelete={handleDeletePreviousVersion(sharedContent.id)}
              />
            );
          })
        ) : (
          <span>No previous versions</span>
        )}
      </div>
      <h2 className={styles.sectionTitle}>Shared drafts</h2>
      <div className={styles.contentContainer}>
        {(sortedSharedDrafts?.length ?? 0 > 0) ? (
          sortedSharedDrafts.map((sharedContent) => {
            return (
              <LineVersion
                key={sharedContent.id}
                participants={playResult.dataOrThrow().participants}
                content={sharedContent}
                characters={props.characters}
                lineInfo={props.lineInfo}
                line={props.line}
                onApplyAsNewVersion={handleApplySharedDraftAsNewVersion(
                  sharedContent,
                )}
                onDelete={handleDeleteSharedDraft(sharedContent.id)}
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
