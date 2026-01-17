import { useEffect, useRef, useState } from 'react';
import Button from '../../components/button.component';
import MenuDropdown from '../../components/menu-dropdown.component';
import Script from '../script/script.component';
import { useScriptContext } from '../script/script.context';
import { useScriptEditionContext } from '../script/script-edition.context';
import type {
  CueLineEditableContent,
  HeadingLineEditableContent,
  LineContent,
  LineEditableContent,
} from '../script/script.models';
import { ScriptChangeHeadingDialog } from './script-change-heading-dialog.component';
import { ScriptChangeCharactersDialog } from './script-change-characters-dialog.component';
import { ScriptLineVersionsDialog } from './script-line-versions-dialog.component';
import ScriptSearchPanel from './script-search-panel.component';
import { useScriptTabToolbarContext } from './script-tab-toolbar.context';
import styles from './script-tab.module.css';

function ScriptTab() {
  const scriptContext = useScriptContext();
  const scriptEditionContext = useScriptEditionContext();
  const handleInitDraft = (
    content: LineContent,
    text?: string,
    deleted?: boolean,
  ) => {
    scriptEditionContext?.initDraft(content, text, deleted);
  };
  const handleEditLineText = (id: string, text: string) => {
    scriptEditionContext?.editLineText(id, text);
  };
  const handleEdit = (id: string, content: LineEditableContent) => {
    scriptEditionContext?.editLine(id, content);
  };
  const [lineIdForMenu, setLineIdForMenu] = useState<string | null>(null);
  const [showChangeHeadingDialog, setShowChangeHeadingDialog] = useState(false);
  const [showChangeCharactersDialog, setShowChangeCharactersDialog] =
    useState(false);
  const [showPreviousVersionsDialog, setShowPreviousVersionsDialog] =
    useState(false);
  const [showSharedDraftsDialog, setShowSharedDraftsDialog] = useState(false);
  const { showSearchPanel } = useScriptTabToolbarContext();
  const menuLine = lineIdForMenu
    ? scriptContext?.lines.get(lineIdForMenu)
    : undefined;
  const [menuLineContent, menuLineInfo] = menuLine
    ? (scriptContext?.getLineContentForDisplayWithInfo(menuLine) ?? [
        null,
        null,
      ])
    : [null, null];
  const handleShowLineMenu = (id: string) => {
    setLineIdForMenu((prev) => {
      if (prev !== id) {
        return id;
      }
      return prev ? null : id;
    });
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
    setShowSharedDraftsDialog(false);
    setShowPreviousVersionsDialog(false);
  };
  const handleDiscardChanges = () => {
    if (lineIdForMenu) {
      scriptEditionContext?.discardChanges(lineIdForMenu);
      menuDialogRef.current?.focus();
    }
  };
  const handleSaveChanges = () => {
    if (lineIdForMenu) {
      scriptEditionContext?.saveChanges(lineIdForMenu);
      if (menuLineContent?.deleted) {
        setLineIdForMenu(null);
      } else {
        menuDialogRef.current?.focus();
      }
    }
  };
  const handleSaveChangesAsNewVersion = () => {
    if (lineIdForMenu) {
      scriptEditionContext?.saveChangesAsNewVersion(lineIdForMenu);
      if (menuLineContent?.deleted) {
        setLineIdForMenu(null);
      } else {
        menuDialogRef.current?.focus();
      }
    }
  };
  const handleSaveChangesAsSharedDraft = () => {
    if (lineIdForMenu) {
      scriptEditionContext?.saveChangesAsSharedDraft(lineIdForMenu);
      menuDialogRef.current?.focus();
    }
  };
  const handleDeleteLine = () => {
    if (lineIdForMenu) {
      const line = scriptContext?.lines.get(lineIdForMenu);
      if (line) {
        const contentWithInfo =
          scriptContext?.getLineContentForDisplayWithInfo(line);
        if (contentWithInfo) {
          scriptEditionContext?.initDraft(contentWithInfo[0], undefined, true);
          menuDialogRef.current?.focus();
        }
      }
    }
  };
  const handleChangeHeadingLevel = () => {
    setShowChangeHeadingDialog(true);
  };
  const handleChangeCharacters = () => {
    setShowChangeCharactersDialog(true);
  };
  const handleShowSharedDrafts = () => {
    setShowSharedDraftsDialog(true);
  };
  const handleShowPreviousVersions = () => {
    setShowPreviousVersionsDialog(true);
  };
  const handleDialogOK = () => {
    closeDialogs();
  };
  const closeDialogs = () => {
    setShowChangeHeadingDialog(false);
    setShowChangeCharactersDialog(false);
    setShowSharedDraftsDialog(false);
    setShowPreviousVersionsDialog(false);
    setLineIdForMenu(null);
  };
  const handleHeadingLevelChanged = (headingLevel: number) => {
    if (menuLineContent) {
      scriptEditionContext?.editLine(menuLineContent.lineId, {
        deleted: menuLineContent.deleted,
        text: menuLineContent.text ?? '',
        lineType: 'heading',
        headingLevel,
      } satisfies HeadingLineEditableContent);
    }
  };
  const handleCharactersChanged = (characters: string[]) => {
    if (menuLineContent) {
      scriptEditionContext?.editLine(menuLineContent.lineId, {
        characters,
        deleted: menuLineContent.deleted,
        text: menuLineContent.text ?? '',
        lineType: 'chartext',
      } satisfies CueLineEditableContent);
    }
  };
  const handleDialogOutsideClick = () => {
    closeDialogs();
  };
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (lineIdForMenu) {
      menuDialogRef.current?.focus();
    }
  }, [lineIdForMenu]);
  const handleDeleteSharedDraft = (contentId: string) => {
    if (menuLineContent) {
      scriptEditionContext?.deleteSharedDraft(
        menuLineContent.lineId,
        contentId,
      );
    }
  };
  const handleDeletePreviousVersion = (contentId: string) => {
    if (menuLineContent) {
      scriptEditionContext?.deletePreviousVersion(
        menuLineContent.lineId,
        contentId,
      );
    }
  };
  const handleApplySharedDraftAsNewVersion = (
    sharedDraftContent: LineContent,
  ) => {
    if (menuLineContent) {
      scriptEditionContext?.applySharedDraftAsNewVersion(
        menuLineContent.lineId,
        sharedDraftContent,
      );
    }
  };
  const handleApplyPreviousVersionAsNewVersion = (
    previousVersion: LineContent,
  ) => {
    if (menuLineContent) {
      scriptEditionContext?.applyPreviousVersionAsNewVersion(
        menuLineContent.lineId,
        previousVersion,
      );
    }
  };
  const handleMenuBlur = () => {
    setLineIdForMenu(null);
  };
  const showModalDialog =
    menuLine &&
    (showChangeHeadingDialog ||
      showChangeCharactersDialog ||
      showSharedDraftsDialog ||
      showPreviousVersionsDialog);
  const showPanels = showSearchPanel;
  return (
    <div className={styles.container}>
      <Script
        scriptContext={scriptContext}
        scriptEditionContext={scriptEditionContext}
        isEditable={true}
        onLineMenuClicked={handleShowLineMenu}
        onLineEdit={handleEdit}
        onLineDraftInit={handleInitDraft}
        onLineDraftTextEdit={handleEditLineText}
      />
      {menuLineContent && !showModalDialog ? (
        <MenuDropdown
          positionAnchorName={`--menu-anchor-${lineIdForMenu}`}
          ref={menuDialogRef}
          onBlur={handleMenuBlur}
        >
          {menuLineContent.lineType === 'heading' ? (
            <Button icon="heading" onClick={handleChangeHeadingLevel}>
              Change heading level
            </Button>
          ) : null}
          {menuLineContent.lineType === 'chartext' ? (
            <Button icon="characterLine" onClick={handleChangeCharacters}>
              Change characters
            </Button>
          ) : null}
          {!menuLineContent.deleted ? (
            <Button icon="delete" onClick={handleDeleteLine}>
              Remove line
            </Button>
          ) : null}
          {menuLineInfo.hasDraft ? (
            menuLineInfo.isNewUnsaved ? (
              <Button icon="save" onClick={handleSaveChangesAsNewVersion}>
                Save
              </Button>
            ) : (
              <>
                <Button icon="save" onClick={handleSaveChanges}>
                  Save changes
                </Button>
                <Button icon="save" onClick={handleSaveChangesAsNewVersion}>
                  Save as new version
                </Button>
                <Button icon="save" onClick={handleSaveChangesAsSharedDraft}>
                  Save as shared draft
                </Button>
                <Button icon="clear" onClick={handleDiscardChanges}>
                  Discard changes
                </Button>
              </>
            )
          ) : null}
          {menuLineInfo.hasPreviousVersions ? (
            <Button
              icon="versions"
              onClick={handleShowPreviousVersions}
              customClassNames={[styles.previousVersionsButton]}
              iconCustomClassNames={[styles.previousVersionsButtonIcon]}
            >
              Show previous versions
            </Button>
          ) : null}
          {menuLineInfo.hasSharedDraft ? (
            <Button
              icon="user"
              onClick={handleShowSharedDrafts}
              customClassNames={[styles.sharedDraftsButton]}
              iconCustomClassNames={[styles.sharedDraftsButtonIcon]}
            >
              Show shared drafts
            </Button>
          ) : null}
        </MenuDropdown>
      ) : null}
      {showPanels ? (
        <div className={styles.panelsContainer}>
          {showSearchPanel ? <ScriptSearchPanel /> : null}
        </div>
      ) : null}
      {showModalDialog && menuLineContent ? (
        <div
          className={styles.modalContainer}
          onClick={handleDialogOutsideClick}
        >
          {showChangeHeadingDialog ? (
            <ScriptChangeHeadingDialog
              onOK={handleDialogOK}
              lineContent={menuLineContent}
              onHeadingLevelChange={handleHeadingLevelChanged}
            />
          ) : showChangeCharactersDialog ? (
            <ScriptChangeCharactersDialog
              onOK={handleDialogOK}
              lineContent={menuLineContent}
              characters={scriptContext?.characters ?? {}}
              onCharactersChange={handleCharactersChanged}
            />
          ) : showPreviousVersionsDialog || showSharedDraftsDialog ? (
            <ScriptLineVersionsDialog
              currentContent={menuLineContent}
              line={menuLine}
              lineInfo={menuLineInfo}
              characters={scriptContext?.characters ?? {}}
              sharedDraftContents={
                scriptContext?.getLineSharedDrafts(menuLine) ?? []
              }
              previousVersionsContents={
                scriptContext?.getLinePreviousVersions(menuLine) ?? []
              }
              onOK={handleDialogOK}
              onDeleteSharedDraft={handleDeleteSharedDraft}
              onDeletePreviousVersion={handleDeletePreviousVersion}
              onApplySharedDraftAsNewVersion={
                handleApplySharedDraftAsNewVersion
              }
              onApplyPreviousVersionAsNewVersion={
                handleApplyPreviousVersionAsNewVersion
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ScriptTab;
