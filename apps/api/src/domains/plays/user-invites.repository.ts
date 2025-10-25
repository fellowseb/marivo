import { Record } from '../../shared/record.ts';
import { UserRepositoryBase } from '../../shared/user-repository-base.ts';
import type { UserInvite } from './invites.models.ts';

interface GetPendingInvitesRecordValues {
  uri: string;
  title: string;
  sent_date: Date;
  owner_full_name: string;
  owner_username: string;
}

export class GetPendingInvitesRecord extends Record<GetPendingInvitesRecordValues> {
  toModel(): UserInvite {
    return {
      uri: this.get('uri'),
      sentDate: this.get('sent_date'),
      playTitle: this.get('title'),
      ownerUsername: this.get('owner_username'),
      ownerFullName: this.get('owner_full_name'),
    };
  }
}

export class UserInvitesRepository extends UserRepositoryBase {
  /**
   * Retrieves all invites for a given user that are in a `pending` state.
   */
  async getPendingInvites(): Promise<UserInvite[]> {
    return (
      await this.sql<GetPendingInvitesRecordValues[]>`
        SELECT 
          uri,
          title,
          sent_date,
          owner_full_name,
          owner_username
        FROM user_pending_invites_view
        WHERE (
          invited_user_id = ${this.userId()}
        );
    `
    ).map((record) => new GetPendingInvitesRecord(record).toModel());
  }

  async respondToInvite(params: { inviteUri: string; accept: boolean }) {
    const userId = this.userId();
    const res = await this.sql<{ play_id: number; role_id: number | null }[]>`
      UPDATE invites
        SET status = ${params.accept ? 'accepted' : 'rejected'}
        WHERE uri = ${params.inviteUri} AND invited_user_id = ${userId}
        RETURNING play_id, role_id;
    `;
    if (!res) {
      throw new Error('Unexpected empty query result');
    }
    const resRow = res[0];
    if (!resRow) {
      throw new Error('Unexpected undefined query result row');
    }
    return {
      playId: resRow.play_id,
      roleId: resRow.role_id,
    };
  }
}
