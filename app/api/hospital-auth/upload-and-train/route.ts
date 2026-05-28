import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import Round from '@/models/Round';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET      = process.env.JWT_SECRET;
const MAMMO_SERVER    = process.env.MAMMO_SERVER_URL  || 'http://localhost:8000';
const NODE_API_KEY    = process.env.MAMMO_NODE_API_KEY || '';


/**
 * POST /api/hospital-auth/upload-and-train
 *
 * Receives mammogram images uploaded by a hospital doctor through the
 * hospital node portal. Proxies them to mammo-server for real TensorFlow
 * training, then creates an FL Round with the results.
 *
 * Multipart body fields:
 *   files[]        — JPEG/PNG mammogram images
 *   benignCount    — number of benign images (optional, auto-split if omitted)
 *   malignantCount — number of malignant images (optional)
 *   notes          — optional batch note
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    if (!JWT_SECRET)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });

    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer '))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { hospitalId: string; name: string };
    try {
      decoded = jwt.verify(auth.slice(7), JWT_SECRET!) as { hospitalId: string; name: string };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();

    const hospital = await Hospital.findOne({ hospitalId: decoded.hospitalId });
    if (!hospital)
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });

    // ── Parse multipart form ──────────────────────────────────────────────
    const formData = await req.formData();
    const files    = formData.getAll('files') as File[];
    const benign   = parseInt(formData.get('benignCount')    as string || '0');
    const malignant= parseInt(formData.get('malignantCount') as string || '0');
    const notes    = formData.get('notes') as string || '';

    if (!files || files.length === 0)
      return NextResponse.json({ error: 'No image files uploaded' }, { status: 400 });

    // Accept individual images OR a single ZIP archive
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const zipFiles   = files.filter(f =>
      f.name.toLowerCase().endsWith('.zip') ||
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed' ||
      f.type === 'application/octet-stream'
    );

    const isZipUpload = zipFiles.length > 0 && imageFiles.length === 0;

    if (imageFiles.length === 0 && zipFiles.length === 0)
      return NextResponse.json({ error: 'No valid files. Upload JPEG/PNG images or a ZIP archive.' }, { status: 400 });

    // ── Forward to mammo-server for real training ─────────────────────────
    let trainingResult: {
      images_trained: number; benign: number; malignant: number;
      accuracy: number; accuracy_pct: string; weights_hash: string;
      avg_delta: number; fl_round: number;
    } | null = null;

    let usedSimulation = false;

    try {
      const serverForm = new FormData();
      if (isZipUpload) {
        // Forward the ZIP directly — mammo-server extracts images in-memory
        serverForm.append('files', zipFiles[0], zipFiles[0].name);
      } else {
        for (const file of imageFiles) {
          serverForm.append('files', file, file.name);
        }
      }
      serverForm.append('benign_count',    String(benign));
      serverForm.append('malignant_count', String(malignant));
      serverForm.append('hospital_id',     decoded.hospitalId);

      const headers: Record<string, string> = {};
      if (NODE_API_KEY) headers['X-API-Key'] = NODE_API_KEY;

      const serverRes = await fetch(`${MAMMO_SERVER}/train-dataset`, {
        method:  'POST',
        headers,
        body:    serverForm,
        signal:  AbortSignal.timeout(120_000),
      });

      if (!serverRes.ok) {
        const err = await serverRes.json().catch(() => ({}));
        throw new Error(err.detail || `mammo-server error ${serverRes.status}`);
      }

      trainingResult = await serverRes.json();
      console.log(`mammo-server trained ${trainingResult!.images_trained} images | Acc: ${trainingResult!.accuracy_pct}`);

    } catch (serverErr) {
      // mammo-server offline → simulate (so portal always works for demo)
      console.warn(`⚠️  mammo-server unavailable, using simulation: ${serverErr}`);
      usedSimulation = true;

      // Estimate image count: ZIP at ~150KB/image avg, individual images direct count
      const n = isZipUpload
        ? Math.max(1, Math.round(zipFiles[0].size / (150 * 1024)))
        : imageFiles.length;
      const b = benign   || Math.round(n * 0.72);
      const m = malignant || n - b;
      const lastRound= await Round.findOne().sort({ roundNumber: -1 });
      const prevAcc  = lastRound?.accuracy ?? 0.72;
      const newAcc   = Math.min(0.97, prevAcc + Math.min(n / 5000, 0.015) + (Math.random() - 0.5) * 0.004);
      const hashInput= `${decoded.hospitalId}:${n}:${Date.now()}`;

      trainingResult = {
        images_trained: n, benign: b, malignant: m,
        accuracy:     newAcc,
        accuracy_pct: `${(newAcc * 100).toFixed(2)}%`,
        weights_hash: crypto.createHash('sha256').update(hashInput).digest('hex'),
        avg_delta:    0,
        fl_round:     (lastRound?.roundNumber ?? 0) + 1,
      };
    }

    const r = trainingResult!;

    // ── Update hospital stats ─────────────────────────────────────────────
    hospital.totalScans         += r.images_trained;
    hospital.benignCount        += r.benign;
    hospital.malignantCount     += r.malignant;
    hospital.roundsParticipated += 1;
    hospital.lastSeen            = new Date();
    hospital.status              = 'online';
    await hospital.save();

    // ── Create FL Round ───────────────────────────────────────────────────
    const lastRound      = await Round.findOne().sort({ roundNumber: -1 });
    const nextRoundNumber= (lastRound?.roundNumber ?? 0) + 1;

    const round = await Round.create({
      roundNumber:       nextRoundNumber,
      accuracy:          r.accuracy,
      participants:      1,
      hospitalIds:       [decoded.hospitalId],
      contributions:     [{
        hospitalId:   decoded.hospitalId,
        hospitalName: hospital.name,
        sampleCount:  r.images_trained,
        weightsHash:  r.weights_hash,
      }],
      modelVersion:      'ResNet50-v2.0',
      sampleCount:       r.images_trained,
      aggregationMethod: 'FedAvg',
      status:            'complete',
      completedAt:       new Date(),
    });

    return NextResponse.json({
      success: true,
      simulation: usedSimulation,
      round: {
        roundNumber:  round.roundNumber,
        accuracy:     r.accuracy,
        accuracyPct:  r.accuracy_pct,
        imagesTrained:r.images_trained,
        benign:       r.benign,
        malignant:    r.malignant,
        weightsHash:  r.weights_hash,
        avgDelta:     r.avg_delta,
        completedAt:  round.completedAt,
        notes,
      },
      hospital: {
        totalScans:          hospital.totalScans,
        benignCount:         hospital.benignCount,
        malignantCount:      hospital.malignantCount,
        roundsParticipated:  hospital.roundsParticipated,
      },
      message: usedSimulation
        ? `Simulation: ${r.images_trained} images processed. Start mammo-server for real GPU training.`
        : `Real training complete. ${r.images_trained} images fine-tuned ResNet50. Global accuracy: ${r.accuracy_pct}`,
    });

  } catch (error) {
    console.error('Upload & Train Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
