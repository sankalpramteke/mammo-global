import jwt from 'jsonwebtoken';
import { isDenied } from '@/lib/tokenDenylist';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AdminPayload {
  adminId: string;
  email: string;
  jti?: string;
}

export function verifyToken(authHeader: string | null): AdminPayload | null {
  if (!authHeader?.startsWith('Bearer ') || !JWT_SECRET) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    // Check if token has been revoked via logout
    if (payload.jti && isDenied(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}
