import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import { verifyToken } from '@/lib/verifyToken';

// GET — list all hospitals
export async function GET(req: NextRequest) {
  if (!verifyToken(req.headers.get('Authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const hospitals = await Hospital.find().sort({ lastSeen: -1 });
  return NextResponse.json({ hospitals });
}

// POST — register/update a hospital (called by mammo-server heartbeat)
export async function POST(req: NextRequest) {
  await connectDB();
  const { hospitalId, name, location } = await req.json();

  if (!hospitalId || !name)
    return NextResponse.json({ error: 'hospitalId and name are required' }, { status: 400 });

  // Generate some realistic-looking initial data for the dashboard demo
  const sampleLat = 20 + (Math.random() * 8); // Spread across India
  const sampleLng = 72 + (Math.random() * 12);
  const sampleScans = Math.floor(Math.random() * 500) + 100;
  const sampleBenign = Math.floor(sampleScans * 0.7);
  const sampleMalignant = sampleScans - sampleBenign;

  const hospital = await Hospital.findOneAndUpdate(
    { hospitalId },
    {
      name,
      location: location || 'India',
      lastSeen: new Date(),
      status: 'online',
      $setOnInsert: { // Only set these on first creation
        lat: sampleLat,
        lng: sampleLng,
        totalScans: sampleScans,
        benignCount: sampleBenign,
        malignantCount: sampleMalignant,
      }
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ hospital });
}
