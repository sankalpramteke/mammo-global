import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mammo_global_secret';

export interface AdminPayload {
  adminId: string;
  email: string;
}

export function verifyToken(authHeader: string | null): AdminPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}
