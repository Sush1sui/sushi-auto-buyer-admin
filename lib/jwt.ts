import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sushi_default_fallback_secret_key';

export interface TokenPayload {
  discordId: string;
  sessionNonce: string;
  isAdmin?: boolean;
}

export function signToken(payload: TokenPayload, expiresIn: string = '30d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
