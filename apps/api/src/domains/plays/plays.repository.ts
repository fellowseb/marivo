import sql from '../../infra/db.ts';
import { Record } from '../../shared/record.ts';
import type { UserPlay } from './plays.models.ts';

interface GetAllPlaysRecordValues {
  id: string;
  title: string;
  uri: string;
  created_date: Date;
  is_owner: boolean;
  owner_clerk_id: string;
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
      isOwner: this.get('is_owner'),
      ownerClerkId: this.get('owner_clerk_id'),
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
          is_owner,
          owner_clerk_id,
          last_modified_date
        FROM user_plays_view
        WHERE (
          is_owner = true 
          AND 
          owned_by = ${params.userId}
        ) OR (
          is_owner = false 
          AND 
          participant_id = ${params.userId}
        );
    `
    ).map((record) => new GetAllPlaysRecord(record).toModel());
  }
}
