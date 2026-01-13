import type {
  Line,
  HeadingLine,
  LineEditableContent,
  LineContent,
} from './script.models';

export function highlightDirections(lineText: string) {
  return lineText.replaceAll(/\(.*\)/g, `<em>$&</em>`);
}

export function handleDirections(lineText: string): [string, string] {
  const res = /^\s*(.*)\s*\n/.exec(lineText);
  if (!res || res.length === 0) {
    return ['', highlightDirections(lineText)];
  }
  return [
    res[0].trim(),
    highlightDirections(lineText.substring(res.index + res[0].length)),
  ];
}

export function isHeading(line: Line): line is HeadingLine {
  return line.type === 'heading';
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
