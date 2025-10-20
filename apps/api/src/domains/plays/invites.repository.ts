import sql from '../../infra/db.ts';
import { Record } from '../../shared/record.ts';
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

interface GetPendingInvites {
  userId: number;
}

export class InvitesRepository {
  /**
   * Retrieves all invites for a given user that are in a `pending` state.
   *
   * @param params.userId - The user's DB id.
   */
  async getPendingInvites(params: GetPendingInvites): Promise<UserInvite[]> {
    return (
      await sql<GetPendingInvitesRecordValues[]>`
        SELECT 
          uri,
          title,
          sent_date,
          owner_full_name,
          owner_username
        FROM user_pending_invites_view
        WHERE (
          invited_user_id = ${params.userId}
        );
    `
    ).map((record) => new GetPendingInvitesRecord(record).toModel());
  }
}
