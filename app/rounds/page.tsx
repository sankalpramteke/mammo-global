'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';

interface Round {
  _id: string; roundNumber: number; accuracy: number; participants: number;
  hospitalIds: string[];
  contributions: { hospitalId: string; hospitalName: string; sampleCount: number; weightsHash: string }[];
  modelVersion: string; status: string; completedAt: string;
}

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRounds = useCallback(async () => {
    const s = getSession();
    if (!s) return;
    const res = await fetch('/api/rounds', { headers: { Authorization: `Bearer ${s.token}` } });
    const data = await res.json();
    setRounds((data.rounds || []).slice().reverse());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const bestAcc = rounds.reduce((best, r) => r.accuracy > best ? r.accuracy : best, 0);

  return (
    <GlobalLayout>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Training Rounds</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Recorded when hospitals submit model weight updates via FedAvg</p>
        </div>
        {bestAcc > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#15803d', lineHeight: 1 }}>{(bestAcc * 100).toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Best Accuracy</div>
            </div>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header">Round Log</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading rounds…
          </div>
        ) : rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>No training rounds recorded yet.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Rounds are recorded when hospitals submit model weight updates.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="disha-table">
              <thead><tr>
                <th style={{ width: '10%' }}>Round #</th>
                <th style={{ width: '15%' }}>Accuracy</th>
                <th style={{ width: '45%' }}>Hospital Contributions (Proof of FL)</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '15%' }}>Completed At</th>
              </tr></thead>
              <tbody>
                {rounds.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 700, color: '#0f2744', verticalAlign: 'top', paddingTop: 16 }}>
                      Round {r.roundNumber}
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden', maxWidth: 80 }}>
                          <div style={{ background: r.accuracy >= 0.7 ? '#16a34a' : '#f59e0b', height: '100%', width: `${r.accuracy * 100}%`, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontWeight: 700, color: r.accuracy >= 0.7 ? '#16a34a' : '#92400e', fontSize: 13 }}>
                          {(r.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {r.contributions && r.contributions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {r.contributions.map((c, idx) => (
                            <div key={idx} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <strong style={{ color: '#0f2744' }}>{c.hospitalName}</strong>
                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{c.sampleCount} samples</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                                <span title="Cryptographic hash proving transmission of model weights">🔐</span>
                                <code style={{ fontSize: 10, wordBreak: 'break-all', color: '#64748b' }}>{c.weightsHash}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.participants} Participants (Legacy round)</span>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                        {r.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', verticalAlign: 'top', paddingTop: 16 }}>
                      {new Date(r.completedAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
