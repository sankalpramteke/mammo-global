import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mammo_global_secret';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, hospitalId, location, password } = await req.json();

    if (!name || !hospitalId || !password) {
      return NextResponse.json({ error: 'Name, Hospital ID, and Password are required' }, { status: 400 });
    }

    const existing = await Hospital.findOne({ hospitalId });

    if (existing) {
      return NextResponse.json({ error: 'Hospital ID already exists on the network' }, { status: 400 });
    }

    const hospital = await Hospital.create({
      name,
      hospitalId,
      location,
      password,
      status: 'offline', // Defaults to offline until it actively pings
      totalScans: 0,
      roundsParticipated: 0
    });

    // Provide immediate login capability upon registration
    const token = jwt.sign(
      { hospitalId: hospital.hospitalId, name: hospital.name, id: hospital._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      hospital: {
        id: hospital._id,
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        totalScans: 0,
        roundsParticipated: 0
      }
    });

  } catch (error) {
    console.error('Hospital Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 });
  }
}
