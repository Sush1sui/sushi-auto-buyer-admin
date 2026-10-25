import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  return secret;
}

export interface TokenPayload {
  discordId: string;
  sessionNonce: string;
  isAdmin?: boolean;
}

export function signToken(payload: TokenPayload, expiresIn: string = '30d'): string {
  return jwt.sign(payload, getSecret(), { expiresIn, algorithm: 'HS256' } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.discordId !== 'string' ||
        !payload.discordId || typeof payload.sessionNonce !== 'string' || !payload.sessionNonce) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
