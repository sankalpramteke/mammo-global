'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';

interface Round { _id: string; roundNumber: number; accuracy: number; participants: number; hospitalIds: string[]; modelVersion: string; status: string; completedAt: string; }

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRounds = useCallback(async () => {
    const s = getSession();
    if (!s) return;
    const res = await fetch('/api/rounds', { headers: { Authorization: `Bearer ${s.token}` } });
    const data = await res.json();
    setRounds((data.rounds || []).slice().reverse()); // newest first
    setLoading(false);
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const bestAcc = rounds.reduce((best, r) => r.accuracy > best ? r.accuracy : best, 0);

  return (
    <GlobalLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1a3a6b', fontSize: 20, fontWeight: 700, margin: 0 }}>🔄 FL Training Round History</h2>
        <div style={{ background: '#d4edda', color: '#155724', padding: '4px 14px', borderRadius: 3, fontSize: 12, fontWeight: 600, border: '1px solid #c3e6cb' }}>
          Best Accuracy: {(bestAcc * 100).toFixed(1)}%
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading rounds…</div>
        ) : rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
            <div style={{ fontSize: 14 }}>No training rounds recorded yet.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Rounds are recorded when hospitals submit model weight updates.</div>
          </div>
        ) : (
          <table className="gov-table">
            <thead>
              <tr>
                <th>Round #</th><th>Accuracy</th><th>Participants</th>
                <th>Hospital IDs</th><th>Model Version</th><th>Status</th><th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 700, color: '#1a3a6b' }}>Round {r.roundNumber}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#eef4ff', borderRadius: 2, height: 6, width: 80, overflow: 'hidden' }}>
                        <div style={{ background: '#2c5f9e', height: '100%', width: `${r.accuracy * 100}%` }} />
                      </div>
                      <span style={{ fontWeight: 700, color: r.accuracy >= 0.7 ? '#155724' : '#856404' }}>
                        {(r.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{r.participants}</td>
                  <td style={{ fontSize: 11 }}>{r.hospitalIds.join(', ') || '—'}</td>
                  <td><code style={{ fontSize: 11 }}>{r.modelVersion}</code></td>
                  <td><span style={{ padding: '2px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                    {r.status.replace('_', ' ').toUpperCase()}
                  </span></td>
                  <td style={{ fontSize: 12 }}>{new Date(r.completedAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </GlobalLayout>
  );
}
