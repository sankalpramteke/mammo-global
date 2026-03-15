import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Hospital from '@/models/Hospital';
import Round from '@/models/Round';
import { verifyToken } from '@/lib/verifyToken';

export async function GET(req: NextRequest) {
  if (!verifyToken(req.headers.get('Authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  
  // Aggregate stats across all hospitals
  const result = await Hospital.aggregate([
    {
      $group: {
        _id: null,
        totalScans: { $sum: '$totalScans' },
        totalBenign: { $sum: '$benignCount' },
        totalMalignant: { $sum: '$malignantCount' },
      }
    }
  ]);
  
  const stats = result[0] || { totalScans: 0, totalBenign: 0, totalMalignant: 0 };
  
  // Get recent activity feed (last 10 rounds)
  const recentRounds = await Round.find()
    .sort({ completedAt: -1 })
    .limit(10)
    .select('roundNumber accuracy hospitalIds completedAt');

  return NextResponse.json({
    stats,
    recentActivity: recentRounds
  });
}
