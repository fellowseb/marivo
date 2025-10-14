import type { PlayListItemModel } from './plays.models';

export type PlaysOrdering =
  | 'orderByTitleAsc'
  | 'orderByTitleDesc'
  | 'orderByCreationDateAsc'
  | 'orderByCreationDateDesc'
  | 'orderByLastModificationDateAsc'
  | 'orderByLastModificationDateDesc';

export interface PlayFilterOptions {
  title?: string;
  onlyPlaysSelfOwns?: boolean;
}

export interface PlaySortOptions {
  orderBy?: PlaysOrdering;
}

export type PlayFilterSortOptions = PlayFilterOptions & PlaySortOptions;

function filterPlay(options: PlayFilterOptions) {
  return (play: PlayListItemModel) => {
    if (options.title && play.title.toLowerCase().indexOf(options.title) < 0) {
      return false;
    }
    if (options.onlyPlaysSelfOwns && !play.isOwner) {
      return false;
    }
    return true;
  };
}

function sortPlay(sortOptions: PlaySortOptions) {
  return (lhs: PlayListItemModel, rhs: PlayListItemModel) => {
    if (!sortOptions.orderBy) {
      return 0;
    }
    switch (sortOptions.orderBy) {
      case 'orderByTitleAsc':
        return rhs.title.localeCompare(lhs.title);
      case 'orderByTitleDesc':
        return lhs.title.localeCompare(rhs.title);
      case 'orderByCreationDateAsc':
        return rhs.createdDate.getTime() - lhs.createdDate.getTime();
      case 'orderByCreationDateDesc':
        return lhs.createdDate.getTime() - rhs.createdDate.getTime();
      case 'orderByLastModificationDateAsc':
        return (
          (rhs.lastModifiedDate?.getTime() ?? 0) -
          (lhs.lastModifiedDate?.getTime() ?? 0)
        );
      case 'orderByLastModificationDateDesc':
        return (
          (lhs.lastModifiedDate?.getTime() ?? 0) -
          (rhs.lastModifiedDate?.getTime() ?? 0)
        );
      default:
        return 0;
    }
  };
}

export function filterSortPlays(
  plays: PlayListItemModel[],
  options: PlayFilterSortOptions,
) {
  return plays.filter(filterPlay(options)).sort(sortPlay(options));
}
