import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { connectDB } from '@/lib/mongoose';
import Admin from '@/models/Admin';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password)
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  const { email, password } = body;

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (!admin)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const token = jwt.sign(
    { adminId: admin._id.toString(), email: admin.email, jti: randomUUID() },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return NextResponse.json({ token, name: admin.name, email: admin.email });
}
