import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Round from '@/models/Round';

/**
 * GET /api/rounds/latest
 * Public endpoint — returns only the latest FL round's accuracy.
 * Used by mammo-client doctor dashboard to show live FL accuracy
 * alongside the static CBIS-DDSM baseline from mammo-server.
 *
 * No auth required — accuracy is public, non-sensitive information.
 */
export async function GET() {
  try {
    await connectDB();
    const latest = await Round.findOne().sort({ roundNumber: -1 }).select('roundNumber accuracy completedAt');
    if (!latest) {
      return NextResponse.json({ accuracy: null, roundNumber: null });
    }
    return NextResponse.json({
      roundNumber: latest.roundNumber,
      accuracy: latest.accuracy,
      completedAt: latest.completedAt,
    });
  } catch (err) {
    console.error('/api/rounds/latest error:', err);
    return NextResponse.json({ accuracy: null, roundNumber: null });
  }
}
