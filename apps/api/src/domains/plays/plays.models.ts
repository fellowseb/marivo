export interface UserPlay {
  id: string;
  title: string;
  uri: string;
  createdDate: Date;
  lastModifiedDate?: Date;
  isOwner: boolean;
  ownerFullName: string;
  ownerUsername: string;
}
