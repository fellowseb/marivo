export interface PlayListItemModel {
  uri: string;
  title: string;
  createdDate: Date;
  lastModifiedDate?: Date;
  isOwner: boolean;
  ownerFullName?: string;
  ownerUsername?: string;
}
