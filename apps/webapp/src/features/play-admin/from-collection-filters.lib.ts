export interface FiltersState {
  title: string;
  author: string;
  languages: string[];
  roles: string[];
  maleRoles: string[];
  femaleRoles: string[];
  genres: string[];
  periods: string[];
  bookmarkedOnly: boolean;
  archivedOnly: boolean;
  /** which filter sections are expanded; persisted too */
  openSections: Record<string, boolean>;
}

export const EMPTY_FILTERS: FiltersState = {
  title: "",
  author: "",
  languages: [],
  roles: [],
  maleRoles: [],
  femaleRoles: [],
  genres: [],
  periods: [],
  bookmarkedOnly: false,
  archivedOnly: false,
  openSections: {},
};

export const FILTER_SECTION_KEYS = [
  "title",
  "author",
  "languages",
  "roles",
  "maleRoles",
  "femaleRoles",
  "genres",
  "periods",
  "bookmarked",
  "archived",
] as const;

export type FilterSectionKey = (typeof FILTER_SECTION_KEYS)[number];

/** "1".."9" selectable values plus "10+"; maps to a min/max range. */
export function rolesToRange(values: string[]): { min?: number; max?: number } {
  if (!values.length) return {};
  const nums = values.map((v) => (v === "10+" ? 10 : Number.parseInt(v, 10)));
  return {
    min: Math.min(...nums),
    max: values.includes("10+") ? undefined : Math.max(...nums),
  };
}

/** A control is "set" when it has a value: non-empty text, non-empty selection, toggle on. */
export function sectionHasValue(key: string, f: FiltersState): boolean {
  switch (key) {
    case "title":
      return f.title.trim().length > 0;
    case "author":
      return f.author.trim().length > 0;
    case "languages":
      return f.languages.length > 0;
    case "roles":
      return f.roles.length > 0;
    case "maleRoles":
      return f.maleRoles.length > 0;
    case "femaleRoles":
      return f.femaleRoles.length > 0;
    case "genres":
      return f.genres.length > 0;
    case "periods":
      return f.periods.length > 0;
    case "bookmarked":
      return f.bookmarkedOnly;
    case "archived":
      return f.archivedOnly;
    default:
      return false;
  }
}

/** Number of controls currently set — shown as the count on the Filter-by toggle. */
export function countSetControls(f: FiltersState): number {
  return FILTER_SECTION_KEYS.filter((k) => sectionHasValue(k, f)).length;
}

/**
 * Build the server-side filter input. A filter is active when it has a
 * value, regardless of whether its section is expanded.
 */
export function toApiFilters(f: FiltersState) {
  const roles = rolesToRange(f.roles);
  const male = rolesToRange(f.maleRoles);
  const female = rolesToRange(f.femaleRoles);
  return {
    title: sectionHasValue("title", f) ? f.title : undefined,
    author: sectionHasValue("author", f) ? f.author : undefined,
    languages: f.languages.length ? f.languages : undefined,
    genres: f.genres.length ? f.genres : undefined,
    periods: f.periods.length ? f.periods : undefined,
    minRoles: roles.min,
    maxRoles: roles.max,
    minMaleRoles: male.min,
    maxMaleRoles: male.max,
    minFemaleRoles: female.min,
    maxFemaleRoles: female.max,
    bookmarkedOnly: f.bookmarkedOnly ? true : undefined,
    archivedOnly: f.archivedOnly ? true : undefined,
  };
}
