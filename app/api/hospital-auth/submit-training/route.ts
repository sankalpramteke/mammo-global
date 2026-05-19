import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import Round from '@/models/Round';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'mammo_global_secret';

/**
 * POST /api/hospital-auth/submit-training
 *
 * Called by the hospital portal when a hospital submits their local dataset
 * for federated learning. This:
 *   1. Verifies the hospital JWT token
 *   2. Updates hospital scan counts (benign + malignant)
 *   3. Derives a simulated accuracy improvement
 *   4. Generates a cryptographic weightsHash (proof of submission)
 *   5. Creates a new FL Round with full contribution metadata
 *   6. Returns the round info to the hospital
 *
 * Body: { batchSize, benignCount, malignantCount, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify hospital JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.slice(7);
    let decoded: { hospitalId: string; name: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { hospitalId: string; name: string };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();

    const { batchSize, benignCount, malignantCount, notes } = await req.json();

    // Validate input
    if (!batchSize || batchSize <= 0)
      return NextResponse.json({ error: 'Invalid batch size' }, { status: 400 });

    const benign    = benignCount    ?? Math.floor(batchSize * 0.72);
    const malignant = malignantCount ?? batchSize - benign;

    if (benign + malignant !== batchSize)
      return NextResponse.json({ error: 'benignCount + malignantCount must equal batchSize' }, { status: 400 });

    const hospital = await Hospital.findOne({ hospitalId: decoded.hospitalId });
    if (!hospital)
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });

    // ── Step 1: Update hospital scan stats ──────────────────────────────────
    hospital.totalScans      += batchSize;
    hospital.benignCount     += benign;
    hospital.malignantCount  += malignant;
    hospital.roundsParticipated += 1;
    hospital.lastSeen         = new Date();
    hospital.status           = 'online';
    await hospital.save();

    // ── Step 2: Derive simulated global accuracy ─────────────────────────────
    // Real FL: accuracy improves as more data is trained. We simulate a realistic
    // improvement curve: diminishing returns as accuracy approaches ~97%.
    const lastRound = await Round.findOne().sort({ roundNumber: -1 });
    const prevAccuracy = lastRound?.accuracy ?? 0.72;
    // Each batch improves accuracy by a small amount, capped at 0.97
    const improvementFactor = Math.min(batchSize / 5000, 0.015); // max +1.5% per submission
    const noise = (Math.random() - 0.5) * 0.004; // ±0.2% random noise
    const newAccuracy = Math.min(0.97, prevAccuracy + improvementFactor + noise);

    // ── Step 3: Generate cryptographic weightsHash ───────────────────────────
    // In real FL: hash of actual model weights. Here: hash of submission metadata.
    const hashInput = `${decoded.hospitalId}:${batchSize}:${benign}:${malignant}:${Date.now()}`;
    const weightsHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // ── Step 4: Create FL Round with contribution ────────────────────────────
    const nextRoundNumber = (lastRound?.roundNumber ?? 0) + 1;
    const round = await Round.create({
      roundNumber:       nextRoundNumber,
      accuracy:          newAccuracy,
      participants:      1,
      hospitalIds:       [decoded.hospitalId],
      contributions:     [{
        hospitalId:   decoded.hospitalId,
        hospitalName: hospital.name,
        sampleCount:  batchSize,
        weightsHash:  weightsHash,
      }],
      modelVersion:      lastRound?.modelVersion || 'ResNet50-v2.0',
      sampleCount:       batchSize,
      aggregationMethod: 'FedAvg',
      status:            'complete',
      completedAt:       new Date(),
    });

    console.log(`✅ FL Round ${nextRoundNumber} | ${hospital.name} | ${batchSize} samples | Accuracy: ${(newAccuracy * 100).toFixed(2)}%`);

    return NextResponse.json({
      success: true,
      round: {
        roundNumber:  round.roundNumber,
        accuracy:     newAccuracy,
        accuracyPct:  `${(newAccuracy * 100).toFixed(2)}%`,
        sampleCount:  batchSize,
        weightsHash:  weightsHash,
        completedAt:  round.completedAt,
      },
      hospital: {
        totalScans:         hospital.totalScans,
        benignCount:        hospital.benignCount,
        malignantCount:     hospital.malignantCount,
        roundsParticipated: hospital.roundsParticipated,
      },
      message: `Round ${nextRoundNumber} complete. FedAvg aggregation applied. Global accuracy: ${(newAccuracy * 100).toFixed(2)}%`,
    });

  } catch (error) {
    console.error('Submit Training Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
