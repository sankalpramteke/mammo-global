'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Hospital { _id: string; hospitalId: string; name: string; location: string; status: string; totalScans: number; benignCount: number; malignantCount: number; roundsParticipated: number; lastSeen: string; createdAt: string; }
interface Round { _id: string; roundNumber: number; accuracy: number; completedAt: string; contributions?: { hospitalId: string; hospitalName: string; sampleCount: number; weightsHash: string }[]; modelVersion: string; }

export default function HospitalDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s || !id) return;
    fetch(`/api/hospitals/${id}`, { headers: { Authorization: `Bearer ${s.token}` } })
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else { setHospital(data.hospital); setRounds(data.rounds || []); } })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <GlobalLayout><div className="disha-card" style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} /><p style={{ color: '#64748b' }}>Loading hospital data...</p></div></GlobalLayout>;
  if (error || !hospital) return <GlobalLayout><div className="disha-card" style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 40, marginBottom: 12 }}>❌</div><p style={{ color: '#64748b' }}>{error || 'Hospital not found'}</p><Link href="/hospitals" style={{ color: '#1d4ed8', fontSize: 13 }}>← Back to Hospitals</Link></div></GlobalLayout>;

  const chartData = rounds.map(r => ({ round: `R${r.roundNumber}`, accuracy: +(r.accuracy * 100).toFixed(1) }));
  const myContributions = rounds.map(r => { const c = r.contributions?.find(x => x.hospitalId === id); return c ? { round: `R${r.roundNumber}`, samples: c.sampleCount } : null; }).filter(Boolean) as { round: string; samples: number }[];
  const malignantPct = hospital.totalScans > 0 ? ((hospital.malignantCount / hospital.totalScans) * 100).toFixed(1) : '0';
  const benignPct = hospital.totalScans > 0 ? ((hospital.benignCount / hospital.totalScans) * 100).toFixed(1) : '0';
  const pieData = [{ name: 'Benign', value: hospital.benignCount }, { name: 'Malignant', value: hospital.malignantCount }].filter(d => d.value > 0);
  if (!pieData.length) pieData.push({ name: 'No Data', value: 1 });

  return (
    <GlobalLayout>
      {/* Back link */}
      <div style={{ marginBottom: 14 }}>
        <Link href="/hospitals" style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>← Back to Hospitals</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', marginBottom: 20, background: 'linear-gradient(135deg, #0f2744, #1a3a6b)', borderRadius: 12, boxShadow: '0 2px 12px rgba(15,39,68,0.15)' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>🏥 {hospital.name}</div>
          <div style={{ color: 'rgba(245,158,11,0.8)', fontSize: 12, marginTop: 3 }}>
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{hospital.hospitalId}</code>
            {hospital.location && <span> · {hospital.location}</span>}
            <span> · Joined {new Date(hospital.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        <span className={hospital.status === 'online' ? 'badge-online' : 'badge-offline'} style={{ fontSize: 13, padding: '6px 16px' }}>{hospital.status.toUpperCase()}</span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { icon: '🔬', label: 'Total Scans', value: hospital.totalScans.toLocaleString(), accent: '#2c5f9e', sub: 'local samples trained' },
          { icon: '✅', label: 'Benign', value: `${hospital.benignCount.toLocaleString()} (${benignPct}%)`, accent: '#16a34a', sub: 'benign detections' },
          { icon: '⚠️', label: 'Malignant', value: `${hospital.malignantCount.toLocaleString()} (${malignantPct}%)`, accent: '#dc2626', sub: 'malignant detections' },
          { icon: '🔄', label: 'FL Rounds', value: hospital.roundsParticipated, accent: '#f59e0b', sub: 'rounds contributed' },
        ].map(c => (
          <div key={c.label} className="disha-card" style={{ padding: 18, borderTop: `3px solid ${c.accent}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: c.accent, opacity: 0.06 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{c.label}</span>
              <span style={{ fontSize: 20 }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', lineHeight: 1, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="disha-card">
          <div className="disha-card-header" style={{ textTransform: 'none', fontSize: 14 }}>📈 Global Accuracy Across Participated Rounds</div>
          <div style={{ padding: '16px 20px 12px' }}>
            {chartData.length === 0 ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>No round data yet.</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => [`${v}%`, 'Accuracy']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="disha-card">
          <div className="disha-card-header" style={{ textTransform: 'none', fontSize: 14 }}>🔬 Local Scan Distribution</div>
          <div style={{ padding: '12px 20px 8px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={['#16a34a', '#dc2626', '#e2e8f0'][i]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => [String(v), 'Scans']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Contribution History Table */}
      <div className="disha-card">
        <div className="disha-card-header" style={{ textTransform: 'none', fontSize: 14 }}>🔐 FL Contribution History (Audit Trail)</div>
        {rounds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No round participation yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="disha-table">
              <thead><tr><th>Round #</th><th>Accuracy</th><th>Samples Contributed</th><th>Weights Hash</th><th>Model Version</th><th>Completed</th></tr></thead>
              <tbody>
                {[...rounds].reverse().map(r => {
                  const c = r.contributions?.find(x => x.hospitalId === id);
                  return (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 700, color: '#0f2744' }}>Round {r.roundNumber}</td>
                      <td><span style={{ fontWeight: 700, color: r.accuracy >= 0.85 ? '#16a34a' : '#f59e0b' }}>{(r.accuracy * 100).toFixed(1)}%</span></td>
                      <td style={{ fontWeight: 600, color: '#f59e0b' }}>{c ? `${c.sampleCount.toLocaleString()} samples` : <span style={{ color: '#94a3b8' }}>Legacy round</span>}</td>
                      <td style={{ maxWidth: 200 }}>{c?.weightsHash ? <code style={{ fontSize: 10, color: '#64748b', wordBreak: 'break-all' }}>🔐 {c.weightsHash.slice(0, 40)}...</code> : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>}</td>
                      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{r.modelVersion}</code></td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.completedAt).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contribution samples chart */}
      {myContributions.length > 0 && (
        <div className="disha-card" style={{ marginTop: 16 }}>
          <div className="disha-card-header" style={{ textTransform: 'none', fontSize: 14 }}>📊 Samples Contributed Per Round</div>
          <div style={{ padding: '16px 20px 12px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={myContributions} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="samples" stroke="#2c5f9e" strokeWidth={2.5} dot={{ r: 4, fill: '#2c5f9e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
