export interface UserPlay {
  id: number;
  title: string;
  uri: string;
  createdDate: Date;
  lastModifiedDate: Date;
  isOwner: boolean;
  ownerFullName: string;
  ownerUsername: string;
}
