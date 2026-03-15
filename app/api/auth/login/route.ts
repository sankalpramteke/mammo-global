import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongoose';
import Admin from '@/models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'mammo_global_secret';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password)
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

  // Auto-create admin on first login if none exists
  let admin = await Admin.findOne({ email });
  if (!admin) {
    const hash = await bcrypt.hash(password, 10);
    admin = await Admin.create({ name: 'Admin', email, password: hash });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const token = jwt.sign({ adminId: admin._id.toString(), email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
  return NextResponse.json({ token, name: admin.name, email: admin.email });
}
