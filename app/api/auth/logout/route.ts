import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { denyToken } from '@/lib/tokenDenylist';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ') || !JWT_SECRET) {
    return NextResponse.json({ success: true }); // Silent — no token = already logged out
  }

  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { jti?: string; exp?: number };
    if (decoded.jti && decoded.exp) {
      denyToken(decoded.jti, decoded.exp * 1000); // exp is in seconds → ms
    }
  } catch {
    // Token already expired or invalid — nothing to revoke
  }

  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
