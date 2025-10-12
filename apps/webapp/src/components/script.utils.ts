import type { LineBase, PartName } from './script.models';

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

export function isPart(line: LineBase): line is PartName {
  return 'partName' in line && typeof line.partName === 'string';
}
