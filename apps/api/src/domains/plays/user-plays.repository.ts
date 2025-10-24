import { Result } from '@marivo/utils';
import { Record } from '../../shared/record.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
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

export class UserPlaysRepository extends UserRepositoryBase {
  /**
   * Retrieves all plays for a given user:
   * - the plays they own
   * - the plays on which they participate
   */
  async getAllPlays(): Promise<UserPlay[]> {
    return (
      await this.sql<GetAllPlaysRecordValues[]>`
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
        WHERE user_id = ${this.userId()};
    `
    ).map((record) => new GetAllPlaysRecord(record).toModel());
  }

  /**
   * Current user joins a play (after accepting an invite).
   */
  async joinPlay(params: { playId: number }) {
    await this.sql<GetAllPlaysRecordValues[]>`
      INSERT INTO users_in_plays (
          user_id,
          play_id,
          joined_date
      ) VALUES (
          ${this.userId()},
          ${params.playId},
          now()
      );
    `;
  }

  /**
   * Current user creates a play project.
   */
  async createPlay(params: { title: string; uri: string }) {
    await this.sql`
      INSERT INTO plays (
        uri,
        title,
        created_date,
        creator_id,
        owner_id,
        last_modified_date
      ) VALUES (
        ${params.uri},
        ${params.title},
        now(),
        ${this.userId()},
        ${this.userId()},
        now()
      );
    `;
  }

  async getPlayDetails(params: { uri: string }): Promise<
    Result<
      {
        title: string;
      },
      RecordNotFound
    >
  > {
    const results = await this.sql<
      {
        title: string;
      }[]
    >`
        SELECT 
          title
        FROM plays
        WHERE uri = ${params.uri};
    `;
    const firstResult = results[0];
    if (!firstResult) {
      return Result.failure(new RecordNotFound());
    }
    return Result.ok(firstResult);
  }

  async checkPlayAccess(params: { uri: string }) {
    const res = await this.sql`
        SELECT 
          id, 
          user_role
        FROM user_plays_view
        WHERE user_id = ${this.userId()} AND uri = ${params.uri};
      `;
    if (!res || !res.length) {
      return Result.failure(undefined);
    }
    return Result.ok(undefined);
  }
}

export class RecordNotFound extends Error {
  public constructor() {
    super('Database record not found');
  }
}
