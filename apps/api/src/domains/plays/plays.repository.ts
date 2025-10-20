import sql from '../../infra/db.ts';
import { Record } from '../../shared/record.ts';
import type { UserPlay } from './plays.models.ts';

interface GetAllPlaysRecordValues {
  id: string;
  title: string;
  uri: string;
  created_date: Date;
  user_role: 'owner' | 'participant';
  owner_username: string;
  owner_full_name: string;
  last_modified_date: Date | null;
}

export class GetAllPlaysRecord extends Record<GetAllPlaysRecordValues> {
  toModel(): UserPlay {
    const lastModifiedDate = this.get('last_modified_date');
    return {
      id: this.get('id'),
      uri: this.get('uri'),
      title: this.get('title'),
      createdDate: this.get('created_date'),
      isOwner: this.get('user_role') === 'owner',
      ownerFullName: this.get('owner_full_name'),
      ownerUsername: this.get('owner_username'),
      ...(lastModifiedDate ? { lastModifiedDate: lastModifiedDate } : {}),
    };
  }
}

interface GetAllPlaysParams {
  userId: number;
}

export class PlaysRepository {
  /**
   * Retrieves all plays for a given user:
   * - the plays they own
   * - the plays on which they participate
   *
   * @param params.userId - The user's DB id.
   */
  async getAllPlays(params: GetAllPlaysParams): Promise<UserPlay[]> {
    return (
      await sql<GetAllPlaysRecordValues[]>`
        SELECT 
          id, 
          title,
          uri,
          created_date,
          user_role,
          owner_full_name,
          owner_username,
          last_modified_date
        FROM user_plays_view
        WHERE user_id = ${params.userId};
    `
    ).map((record) => new GetAllPlaysRecord(record).toModel());
  }
}
