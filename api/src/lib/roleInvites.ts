import { randomBytes } from 'crypto';
import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export type RoleInvite = {
  id: string;
  email: string;
  role: string; // e.g., 'teacher'
  invitedBy: string; // admin uid
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string; // random secret used by accept flow
  expiresAt: Timestamp;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedBy?: string; // uid of the user who accepted
};

let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

export function generateToken(bytes = 32): string {
  // URL-safe base64 without padding
  return randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createRoleInvite(params: { email: string; role: string; invitedBy: string; expiresInHours?: number }): Promise<RoleInvite> {
  const { email, role, invitedBy, expiresInHours = 72 } = params;
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + expiresInHours * 60 * 60 * 1000);
  const token = generateToken(32);

  const ref = getDb().collection('roleInvites').doc();
  const invite: Omit<RoleInvite, 'id'> = {
    email: email.toLowerCase(),
    role,
    invitedBy,
    status: 'pending',
    token,
    createdAt: now,
    expiresAt,
  };
  await ref.set(invite);
  return { id: ref.id, ...invite } as RoleInvite;
}

export async function getInviteByToken(token: string): Promise<RoleInvite | null> {
  // Test-only path to avoid Firestore during e2e
  if (process.env.ALLOW_TEST_INVITES === '1' && token.startsWith('test-')) {
    const now = Timestamp.now();
    const future = Timestamp.fromMillis(now.toMillis() + 60 * 60 * 1000);
    return {
      id: 'test',
      email: 'teacher@example.com',
      role: 'teacher',
      invitedBy: 'test-admin',
      status: 'pending',
      token,
      createdAt: now,
      expiresAt: future,
    } as RoleInvite;
  }
  const q = await getDb().collection('roleInvites').where('token', '==', token).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0]!;
  const data = doc.data() as Omit<RoleInvite, 'id'>;
  return { id: doc.id, ...data } as RoleInvite;
}

export async function markInviteAccepted(inviteId: string, acceptedBy: string): Promise<void> {
  if (process.env.ALLOW_TEST_INVITES === '1' && inviteId === 'test') {
    return; // no-op in test mode
  }
  const ref = getDb().collection('roleInvites').doc(inviteId);
  await ref.set({ status: 'accepted', acceptedAt: Timestamp.now(), acceptedBy }, { merge: true });
}

export function isInviteUsable(inv: RoleInvite | null): inv is RoleInvite {
  if (!inv) return false;
  if (inv.status !== 'pending') return false;
  return inv.expiresAt.toMillis() > Timestamp.now().toMillis();
}
