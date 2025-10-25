import { adminAuth } from './firebaseAdmin';

export type VerifiedToken = {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
};

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseBearer(authorizationHeader: string | null | undefined): string {
  if (!authorizationHeader) {
    throw new AuthError(401, 'auth/unauthorized', 'Missing Authorization header');
  }
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new AuthError(401, 'auth/unauthorized', 'Missing or invalid Authorization header');
  }
  return token.trim();
}

export async function verifyIdToken(authorizationHeader: string | null | undefined): Promise<VerifiedToken> {
  const idToken = parseBearer(authorizationHeader);
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: !!decoded.email_verified,
    };
  } catch {
    throw new AuthError(401, 'auth/unauthorized', 'Invalid or expired ID token');
  }
}
