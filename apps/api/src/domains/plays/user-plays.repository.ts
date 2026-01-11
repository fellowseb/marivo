import z from 'zod';
import { Result } from '@marivo/utils';
import { Record } from '../../shared/record.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
import type { UserPlay } from './plays.models.ts';
import { AppError } from '../../shared/error.ts';

interface GetAllPlaysRecordValues {
  id: number;
  title: string;
  uri: string;
  created_date: Date;
  user_role: 'owner' | 'participant';
  owner_username: string;
  owner_full_name: string;
  last_modified_date: Date;
}

export class GetAllPlaysRecord extends Record<GetAllPlaysRecordValues> {
  toModel(): UserPlay {
    return {
      id: this.get('id'),
      uri: this.get('uri'),
      title: this.get('title'),
      createdDate: this.get('created_date'),
      isOwner: this.get('user_role') === 'owner',
      ownerFullName: this.get('owner_full_name'),
      ownerUsername: this.get('owner_username'),
      lastModifiedDate: this.get('last_modified_date'),
    };
  }
}

interface PlayDetailsRecordValues {
  id: number;
  title: string;
  uri: string;
  created_date: Date;
  user_role: 'owner' | 'participant';
  owner_username: string;
  owner_full_name: string;
  last_modified_date: Date;
  permissions: string | null;
}

interface PlayParticipantsRecordValues {
  username: string;
  full_name: string;
}

/**
 * !!! CAUTION !!!
 * Do not add any non-optional entries.
 */
export const PERMISSIONS_SCHEMA = z.looseObject({
  scriptRead: z.boolean(),
  scriptWriteSharedDrafts: z.boolean(),
  scriptWrite: z.boolean(),
  stagingNotesRead: z.boolean(),
  stagingNotesWrite: z.boolean(),
  blockingRead: z.boolean(),
  blockingWrite: z.boolean(),
  memorizeRead: z.boolean(),
  planningRead: z.boolean(),
  planningWrite: z.boolean(),
  settingsRead: z.boolean(),
  settingsWrite: z.boolean(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PERMISSIONS_SCHEMA_STRICT = PERMISSIONS_SCHEMA.strict();

type UserPermissions = z.infer<typeof PERMISSIONS_SCHEMA_STRICT>;

const PERMISSIONS_DEFAULTS = {
  scriptRead: true,
  scriptWriteSharedDrafts: false,
  scriptWrite: false,
  stagingNotesRead: false,
  stagingNotesWrite: false,
  blockingRead: false,
  blockingWrite: false,
  memorizeRead: false,
  planningRead: false,
  planningWrite: false,
  settingsRead: false,
  settingsWrite: false,
} satisfies UserPermissions;

interface PlayDetails {
  details: UserPlay;
  permissions: UserPermissions;
}

interface PlayParticipants {
  participants: { [username: string]: { fullName: string } };
}

export class PlayDetailsRecord extends Record<PlayDetailsRecordValues> {
  toModel(): PlayDetails {
    const isOwner = this.get('user_role') === 'owner';
    let permissionsResolved: UserPermissions = PERMISSIONS_DEFAULTS;
    if (isOwner) {
      permissionsResolved = Object.keys(PERMISSIONS_DEFAULTS).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as UserPermissions,
      );
    } else {
      const dbPermissions = this.get('permissions');
      if (dbPermissions) {
        const result = PERMISSIONS_SCHEMA.safeParse(dbPermissions);
        if (!result.success) {
          throw new Error('Invalid permissions object in database');
        }
        permissionsResolved = Object.keys(PERMISSIONS_DEFAULTS).reduce(
          (acc, key) => ({
            ...acc,
            [key]: result.data[key],
          }),
          {} as UserPermissions,
        );
      }
    }
    return {
      details: {
        id: this.get('id'),
        uri: this.get('uri'),
        title: this.get('title'),
        createdDate: this.get('created_date'),
        isOwner,
        ownerFullName: this.get('owner_full_name'),
        ownerUsername: this.get('owner_username'),
        lastModifiedDate: this.get('last_modified_date'),
      },
      permissions: {
        ...PERMISSIONS_DEFAULTS,
        ...permissionsResolved,
      },
    };
  }
}

export class PlayParticipantsRecord {
  constructor(records: PlayParticipantsRecordValues[]) {
    this.records = records;
  }
  toModel(): PlayParticipants {
    return this.records.reduce(
      (acc, { username, full_name }) => {
        return {
          participants: {
            ...acc.participants,
            [username]: { fullName: full_name },
          },
        };
      },
      { participants: {} } as PlayParticipants,
    );
  }
  private records: PlayParticipantsRecordValues[];
}

const DEFAULT_COMEDIAN_ROLE_NAME = 'Comedian';
const DEFAULT_COMEDIAN_PERMISSIONS = {
  scriptRead: true,
  scriptWriteSharedDrafts: true,
  scriptWrite: true,
  stagingNotesRead: true,
  stagingNotesWrite: true,
  blockingRead: true,
  blockingWrite: true,
  memorizeRead: true,
  planningRead: true,
  planningWrite: true,
  settingsRead: false,
  settingsWrite: false,
};

class PlayNotFound extends AppError {
  constructor(uri: string) {
    super('Play not found', 'NOT_FOUND', {
      cause: {
        uri,
      },
    });
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
  async joinPlay(params: { playId: number; roleId: number | null }) {
    await this.sql<GetAllPlaysRecordValues[]>`
      INSERT INTO users_in_plays (
          user_id,
          play_id,
          joined_date,
          role_id
      ) VALUES (
          ${this.userId()},
          ${params.playId},
          now(),
          ${params.roleId} 
      );
    `;
  }

  /**
   * Current user creates a play project.
   */
  async createPlay(params: { title: string; uri: string }) {
    const [scriptRow] = await this.sql<{ id: number }[]>`
      INSERT INTO scripts (
        checksum
      ) VALUES (
        '1b91a822a6a14f389f85590bfe664962'
      ) RETURNING id;
`;
    if (!scriptRow) {
      throw new Error('undefined new scriptRow');
    }
    const [playRow] = await this.sql<{ id: number }[]>`
      INSERT INTO plays (
        uri,
        title,
        created_date,
        creator_id,
        owner_id,
        last_modified_date,
        script_id
      ) VALUES (
        ${params.uri},
        ${params.title},
        now(),
        ${this.userId()},
        ${this.userId()},
        now(),
        ${scriptRow.id}
      ) RETURNING id;
    `;
    if (playRow === undefined) {
      throw new Error('Unexpected empty row on createPlay');
    }
    const { id: createdPlayId } = playRow;
    await this.sql`
      INSERT INTO roles (
        name,
        play_id,
        permissions
      ) VALUES (
        ${DEFAULT_COMEDIAN_ROLE_NAME},
        ${createdPlayId},
        ${this.sql.json(DEFAULT_COMEDIAN_PERMISSIONS)}::jsonb
      );
    `;
  }

  async getPlayDetails(params: {
    uri: string;
  }): Promise<Result<PlayDetails & PlayParticipants, RecordNotFound>> {
    const results = await this.sql<PlayDetailsRecordValues[]>`
      SELECT
        up.id, 
        up.title,
        up.uri,
        up.created_date,
        up.user_role,
        up.owner_full_name,
        up.owner_username,
        up.last_modified_date,
        r.permissions
      FROM user_plays_view up
        LEFT JOIN roles r ON r.id = up.role_id
      WHERE up.user_id = ${this.userId()} AND up.uri = ${params.uri};
    `;
    const firstResult = results[0];
    if (!firstResult) {
      return Result.failure(new RecordNotFound());
    }
    const participantsResults = await this.sql<PlayParticipantsRecordValues[]>`
      SELECT
        u.username,
        u.full_name
      FROM users_in_plays uip
        JOIN users u ON u.id = uip.user_id
      WHERE uip.play_id = ${firstResult.id};
    `;
    return Result.ok({
      ...new PlayDetailsRecord(firstResult).toModel(),
      ...new PlayParticipantsRecord(participantsResults).toModel(),
    });
  }

  async checkPlayAccess(params: {
    uri: string;
  }): Promise<Result<undefined, PlayNotFound>> {
    const res = await this.sql<
      {
        id: number;
        user_role: 'owner' | 'participant';
      }[]
    >`
        SELECT 
          id, 
          user_role
        FROM user_plays_view
        WHERE user_id = ${this.userId()} AND uri = ${params.uri};
      `;
    if (!res || res.length !== 1) {
      return Result.failure(new PlayNotFound(params.uri));
    }
    return Result.ok(undefined);
  }
}

export class RecordNotFound extends Error {
  public constructor() {
    super('Database record not found');
  }
}
