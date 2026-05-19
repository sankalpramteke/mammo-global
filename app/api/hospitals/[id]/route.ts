import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import Round from '@/models/Round';
import { verifyToken } from '@/lib/verifyToken';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyToken(req.headers.get('Authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const hospital = await Hospital.findOne({ hospitalId: params.id });
  if (!hospital) return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });

  // Rounds where this hospital participated (by hospitalIds array or contributions)
  const rounds = await Round.find({
    $or: [
      { hospitalIds: params.id },
      { 'contributions.hospitalId': params.id },
    ],
  }).sort({ roundNumber: 1 });

  return NextResponse.json({ hospital, rounds });
}
