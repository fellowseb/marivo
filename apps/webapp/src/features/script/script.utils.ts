import type { LineContents } from './script-state';
import type {
  LineEditableContent,
  LineContent,
  Line,
  LineInfo,
  HeadingLineContent,
} from './script.models';

function displayDirection(direction: string) {
  return direction.substring(1, direction.length - 1);
}

export function highlightDirections(lineText: string) {
  return lineText.replaceAll(
    /\(\(.*\)\)/g,
    (direction) => `<em>${displayDirection(direction)}</em>`,
  );
}

export function handleDirections(lineText: string): [string, string] {
  const res = /^\s*\(\((.*)\)\)\s*\n/.exec(lineText);
  if (!res || res.length === 0) {
    return ['', highlightDirections(lineText)];
  }
  const direction = res[0].trim();
  return [
    displayDirection(direction),
    highlightDirections(lineText.substring(res.index + res[0].length)),
  ];
}

export function printCharacterName(characters: { [charId: string]: string }) {
  return (charId: string) => {
    // Special case
    if (charId === 'ALL') {
      return 'ALL';
    }
    return characters[charId];
  };
}

function areArraysEqual<T>(lhs: T[], rhs: T[]) {
  return lhs.length === rhs.length && lhs.every((v) => rhs.includes(v));
}

export function isLineEditableContentSameAsPrevious(
  editableContent: LineEditableContent,
  previous: LineContent,
) {
  const commonsEqual =
    previous.text === editableContent.text &&
    previous.deleted === editableContent.deleted;
  return (
    commonsEqual &&
    ((editableContent.lineType === 'chartext' &&
      previous.lineType === 'chartext' &&
      areArraysEqual(editableContent.characters, previous.characters)) ||
      (editableContent.lineType === 'heading' &&
        previous.lineType === 'heading' &&
        editableContent.headingLevel === previous.headingLevel))
  );
}

export function replaceBreaklines(lineText: string) {
  return lineText.replaceAll('\n', '<br/>');
}

export function getLineContentForDisplayWithInfo(
  line: Line,
  lineContents: Map<string, LineContent>,
  lineToContents: Map<string, LineContents>,
): [LineContent, LineInfo] {
  let content;
  const { id } = line;
  // Check for presence of a draft content item
  const draftContent = lineContents.get(id);
  if (draftContent) {
    content = draftContent;
  }
  const contents = lineToContents.get(id);
  let hasSharedDraft = false;
  let hasPreviousVersions = false;
  let isNewUnsaved = false;
  // Check for prensence of versionned content items
  if (contents) {
    const { versions, sharedDrafts } = contents;
    const presentVersions = versions.filter(Boolean).reverse().slice();
    if (!content && presentVersions.length) {
      const latestVersionContent = lineContents.get(presentVersions[0] ?? '');
      if (latestVersionContent) {
        content = latestVersionContent;
      }
    }
    hasSharedDraft = sharedDrafts.length > 0;
    hasPreviousVersions = presentVersions.length > 1;
    isNewUnsaved = presentVersions.length === 0;
  }
  if (!content) {
    throw new Error('No line content found');
  }
  return [
    content,
    {
      hasDraft: !!draftContent,
      hasSharedDraft,
      hasPreviousVersions,
      isNewUnsaved,
    },
  ];
}

export function getLineSharedDrafts(
  line: Line,
  lineContents: Map<string, LineContent>,
  lineToContents: Map<string, LineContents>,
): LineContent[] {
  const { id } = line;
  const contents = lineToContents.get(id);
  return contents
    ? contents.sharedDrafts.map((contentId) => {
        return lineContents.get(contentId)!;
      })
    : [];
}

export function getLinePreviousVersions(
  line: Line,
  lineContents: Map<string, LineContent>,
  lineToContents: Map<string, LineContents>,
): LineContent[] {
  const { id } = line;
  const contents = lineToContents.get(id);
  const previousVersions = contents?.versions
    .filter(Boolean)
    .reverse()
    .slice(1);
  return contents
    ? (previousVersions?.map((contentId) => {
        return lineContents.get(contentId)!;
      }) ?? [])
    : [];
}

export function buildScriptOutline(
  linesOrder: string[],
  lines: Map<string, Line>,
  lineContents: Map<string, LineContent>,
  lineToContents: Map<string, LineContents>,
) {
  return linesOrder.reduce(
    (acc, curr) => {
      const line = lines.get(curr);
      if (!line || line.type !== 'heading') {
        return acc;
      }
      const [lineContent] = getLineContentForDisplayWithInfo(
        line,
        lineContents,
        lineToContents,
      );
      if (lineContent.deleted) {
        return acc;
      }
      const headingContent = lineContent as HeadingLineContent;
      return acc.concat({
        heading: headingContent.text,
        headingLevel: headingContent.headingLevel,
      });
    },
    [] as { heading: string; headingLevel: number }[],
  );
}
