import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import Round from '@/models/Round';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Verify admin JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const { hospitalId, customSamples } = body || {};

    if (!hospitalId)
      return NextResponse.json({ error: 'Hospital ID required' }, { status: 400 });

    const hospital = await Hospital.findOne({ hospitalId });
    if (!hospital)
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });

    const batchSize = customSamples ? parseInt(customSamples, 10) : Math.floor(Math.random() * 101 + 100);
    if (isNaN(batchSize) || batchSize <= 0 || batchSize > 500)
      return NextResponse.json({ error: 'Batch size must be 1–500' }, { status: 400 });

    const benign    = Math.floor(batchSize * 0.72);
    const malignant = batchSize - benign;

    hospital.totalScans         += batchSize;
    hospital.benignCount        += benign;
    hospital.malignantCount     += malignant;
    hospital.roundsParticipated += 1;
    hospital.lastSeen            = new Date();
    hospital.status              = 'online';
    await hospital.save();

    // Create a simulated FL round record
    const lastRound  = await Round.findOne().sort({ roundNumber: -1 });
    const prevAcc    = lastRound?.accuracy ?? 0.72;
    const newAcc     = Math.min(0.97, prevAcc + Math.min(batchSize / 5000, 0.015) + (Math.random() - 0.5) * 0.003);
    const weightsHash = crypto.createHash('sha256').update(`${hospitalId}:${batchSize}:${Date.now()}`).digest('hex');

    await Round.create({
      roundNumber:       (lastRound?.roundNumber ?? 0) + 1,
      accuracy:          newAcc,
      participants:      1,
      hospitalIds:       [hospital.hospitalId],
      contributions:     [{ hospitalId: hospital.hospitalId, hospitalName: hospital.name, sampleCount: batchSize, weightsHash }],
      modelVersion:      'ResNet50-v2.0',
      sampleCount:       batchSize,
      aggregationMethod: 'FedAvg',
      status:            'complete',
      completedAt:       new Date(),
    });

    return NextResponse.json({
      success: true,
      simulatedBatchSize: batchSize,
      hospital: { totalScans: hospital.totalScans, roundsParticipated: hospital.roundsParticipated },
    });

  } catch (error) {
    console.error('Simulate Training Error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
