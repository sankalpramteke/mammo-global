import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Round from '@/models/Round';
import { verifyToken } from '@/lib/verifyToken';

// GET — list all rounds (used by dashboard chart)
export async function GET(req: NextRequest) {
  if (!verifyToken(req.headers.get('Authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const rounds = await Round.find().sort({ roundNumber: 1 });
  return NextResponse.json({ rounds });
}

// POST — create a new FL round (called by admin or mammo-server)
export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const lastRound = await Round.findOne().sort({ roundNumber: -1 });
  const nextRound = (lastRound?.roundNumber || 0) + 1;

  const round = await Round.create({
    roundNumber: nextRound,
    accuracy: body.accuracy || 0,
    participants: body.participants || 0,
    hospitalIds: body.hospitalIds || [],
    modelVersion: body.modelVersion || 'ResNet50-v1.0',
    status: 'complete',
  });

  return NextResponse.json({ round });
}
