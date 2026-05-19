'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import toast from 'react-hot-toast';

const IndiaMap = dynamic(() => import('@/components/IndiaMap'), {
  ssr: false,
  loading: () => <div style={{ height: 280, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', borderRadius: 8, fontSize: 12 }}>Loading Map...</div>,
});

interface Round { roundNumber: number; accuracy: number; participants: number; modelVersion: string; completedAt: string; contributions?: { hospitalId: string; hospitalName: string; sampleCount: number }[]; }
interface Hospital { _id: string; hospitalId: string; name: string; status: string; totalScans: number; benignCount: number; malignantCount: number; roundsParticipated: number; lastSeen: string; lat: number; lng: number; location: string; }
interface Stats { totalScans: number; totalBenign: number; totalMalignant: number; }

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KPICard({ label, value, sub, accent, icon, delta }: { label: string; value: string | number; sub: string; accent: string; icon: string; delta?: string | null }) {
  const isPos = delta && !delta.startsWith('-');
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 600, color: isPos ? '#16a34a' : '#dc2626', background: isPos ? '#dcfce7' : '#fee2e2', border: `1px solid ${isPos ? '#bbf7d0' : '#fecaca'}`, padding: '2px 8px', borderRadius: 20 }}>
            {isPos ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{sub}</div>
    </div>
  );
}

/* ── Section Header ──────────────────────────────────────────────────────── */
function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>{title}</h2>
      {right}
    </div>
  );
}

export default function DashboardPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<Stats>({ totalScans: 0, totalBenign: 0, totalMalignant: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simHospitalId, setSimHospitalId] = useState('');
  const [simBatch, setSimBatch] = useState('500');
  const [simulating, setSimulating] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const s = getSession(); if (!s) return;
    try {
      const h = { Authorization: `Bearer ${s.token}` };
      const [rRes, hRes, sRes] = await Promise.all([fetch('/api/rounds', { headers: h }), fetch('/api/hospitals', { headers: h }), fetch('/api/stats', { headers: h })]);
      const [rData, hData, sData] = await Promise.all([rRes.json(), hRes.json(), sRes.json()]);
      setRounds(rData.rounds || []); setHospitals(hData.hospitals || []);
      if (sData.stats) setStats(sData.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(() => fetchData(true), 30000); return () => clearInterval(t); }, [fetchData]);

  const handleSimulate = async () => {
    if (!simHospitalId || !simBatch) return;
    setSimulating(true);
    const s = getSession();
    try {
      const res = await fetch('/api/hospital-auth/simulate-training', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.token}` }, body: JSON.stringify({ hospitalId: simHospitalId, customSamples: simBatch }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Simulated ${data.simulatedBatchSize} samples for ${simHospitalId}`);
      fetchData(true);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Simulation failed'); }
    finally { setSimulating(false); }
  };

  const latestRound = rounds[rounds.length - 1];
  const prevRound = rounds[rounds.length - 2];
  const accuracyDelta = latestRound && prevRound ? ((latestRound.accuracy - prevRound.accuracy) * 100).toFixed(1) : null;
  const onlineCount = hospitals.filter(h => h.status === 'online').length;
  const lastSync = hospitals.length ? new Date(Math.max(...hospitals.map(h => new Date(h.lastSeen).getTime()))) : null;
  const chartData = rounds.map(r => ({ round: `R${r.roundNumber}`, accuracy: +(r.accuracy * 100).toFixed(1) }));
  const pieData = [{ name: 'Benign', value: stats.totalBenign }, { name: 'Malignant', value: stats.totalMalignant }].filter(d => d.value > 0);
  if (!pieData.length) pieData.push({ name: 'No Data', value: 1 });
  const barData = hospitals.map(h => ({ name: h.name.length > 12 ? h.name.slice(0, 12) + '…' : h.name, Benign: h.benignCount || 0, Malignant: h.malignantCount || 0 }));
  const leaderboard = [...hospitals].sort((a, b) => b.totalScans - a.totalScans);
  const maxScans = leaderboard[0]?.totalScans || 1;
  const recentRounds = [...rounds].reverse().slice(0, 6);

  const tooltipStyle = { borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 };

  if (loading) return (
    <GlobalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 14 }}>
        <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0f2744', borderRadius: '50%' }} />
        <p style={{ fontSize: 13, color: '#64748b' }}>Loading dashboard data…</p>
      </div>
    </GlobalLayout>
  );

  return (
    <GlobalLayout>

      {/* ── Status Strip ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        {[
          { label: 'Nodes Online', value: `${onlineCount}/${hospitals.length}`, accent: onlineCount > 0 ? '#16a34a' : '#dc2626', dot: true },
          { label: 'Last Sync', value: lastSync ? lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—' },
          { label: 'Algorithm', value: 'FedAvg' },
          { label: 'Model', value: latestRound?.modelVersion || 'ResNet50-v1.0' },
          { label: 'Total Rounds', value: rounds.length },
        ].map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {i > 0 && <div style={{ width: 1, height: 16, background: '#e2e8f0', marginRight: 20 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {'dot' in item && <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: item.accent, display: 'inline-block' }} />}
              <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{item.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'dot' in item ? item.accent : '#0f172a' }}>{item.value}</span>
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => fetchData(false)} disabled={refreshing} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: refreshing ? 'rotate(360deg)' : 'none' }}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a6b" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} label="Total Hospitals"  value={hospitals.length}  accent="#1a3a6b" sub={`${onlineCount} online now`} />
        <KPICard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} label="Samples Trained"  value={stats.totalScans.toLocaleString()} accent="#f59e0b" sub="across all nodes" />
        <KPICard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>} label="FL Rounds"        value={rounds.length}     accent="#2563eb" sub="training rounds complete" />
        <KPICard icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} label="Global Accuracy"  value={latestRound ? `${(latestRound.accuracy * 100).toFixed(1)}%` : 'N/A'} accent="#16a34a" sub="latest round" delta={accuracyDelta} />
      </div>

      {/* ── Accuracy + Activity ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#fef9ec' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
            Model Accuracy Progression
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>Updates after every FL round</span>
          </div>
          <div style={{ padding: '16px 20px 12px' }}>
            {chartData.length === 0
              ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No rounds yet.</div>
              : <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Accuracy']} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="accuracy" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={600} />
                  </LineChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#f3f0ff' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            Recent Activity
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {recentRounds.length === 0
              ? <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 12 }}>No activity yet.</div>
              : recentRounds.map((r, i) => (
                <div key={r.roundNumber} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: i < recentRounds.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 800 }}>R{r.roundNumber}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>Round {r.roundNumber} Complete</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                      <span style={{ color: r.accuracy >= 0.85 ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>{(r.accuracy * 100).toFixed(1)}%</span>
                      {r.contributions?.length ? ` · ${r.contributions.length} hospital${r.contributions.length > 1 ? 's' : ''}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{new Date(r.completedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span style={{ fontSize: 14, color: r.accuracy >= 0.85 ? '#16a34a' : r.accuracy >= 0.7 ? '#f59e0b' : '#dc2626' }}>
                    {r.accuracy >= 0.85 ? '↑' : r.accuracy >= 0.7 ? '→' : '↓'}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Per-Hospital Breakdown + Leaderboard ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#f0fdf4' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </div>
            Per-Hospital Scan Breakdown
          </div>
          <div style={{ padding: '14px 20px 12px' }}>
            {barData.length === 0
              ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>No hospitals yet.</div>
              : <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10.5, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }} />
                    <Bar dataKey="Benign" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Malignant" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#fffbeb' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              </div>
            Contribution Leaderboard
          </div>
          <div style={{ padding: '12px 16px' }}>
            {leaderboard.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12 }}>No hospitals yet.</div>
              : leaderboard.map((h, i) => {
                  const pct = Math.round((h.totalScans / maxScans) * 100);
                  return (
                    <div key={h._id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 18, textAlign: 'center', fontFamily: 'monospace' }}>#{i + 1}</span>
                          <Link href={`/hospitals/${h.hospitalId}`} style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', textDecoration: 'none' }} className="hover:underline">{h.name}</Link>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={h.status === 'online' ? 'badge-online' : 'badge-offline'} style={{ fontSize: 10 }}>{h.status}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#f59e0b' }}>{h.totalScans.toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #0f2744, #2563eb)`, borderRadius: 10, transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>{h.roundsParticipated} rounds · {pct}% of network total</div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* ── Map + Hospital Table ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#eff6ff' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
            Node Distribution — India
          </div>
          <div style={{ padding: '14px 16px' }}><IndiaMap hospitals={hospitals} /></div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="card-title-icon" style={{ background: '#eff6ff' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                </div>
              Active Hospital Nodes
            </div>
            <span className="badge-online" style={{ fontSize: 10 }}>{onlineCount} Online</span>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            {hospitals.length === 0
              ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 12 }}>No hospitals connected.</div>
              : <table className="disha-table">
                  <thead><tr><th>Hospital</th><th>ID</th><th>Status</th><th>Scans</th><th>Rounds</th></tr></thead>
                  <tbody>
                    {hospitals.slice(0, 6).map(h => (
                      <tr key={h._id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/hospitals/${h.hospitalId}`} style={{ color: '#0f172a', textDecoration: 'none', fontSize: 13 }}>{h.name}</Link>
                        </td>
                        <td><code style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: 5, fontSize: 10.5, color: '#64748b', border: '1px solid #e2e8f0' }}>{h.hospitalId}</code></td>
                        <td><span className={h.status === 'online' ? 'badge-online' : 'badge-offline'} style={{ fontSize: 10.5 }}>{h.status}</span></td>
                        <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>{h.totalScans.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>{h.roundsParticipated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      </div>

      {/* ── Pie + Simulation Panel ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#f5f3ff' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
            Global Prediction Split
          </div>
          <div style={{ padding: '12px 16px 8px' }}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={64} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={['#16a34a', '#dc2626', '#e2e8f0'][i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Scans']} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 4 }}>
              Total: <strong style={{ color: '#0f172a' }}>{stats.totalScans.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-icon" style={{ background: '#fffbeb' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
            FL Training Simulator — Admin Tool
          </div>
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 18 }}>
              Simulate a local training round at any hospital node. Increments the hospital&apos;s sample count and stages encrypted FL weights for global aggregation — useful for demos and network testing.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hospital Node</label>
                <select value={simHospitalId} onChange={e => setSimHospitalId(e.target.value)} className="disha-input" style={{ fontSize: 12.5 }}>
                  <option value="">Select hospital…</option>
                  {hospitals.map(h => <option key={h._id} value={h.hospitalId}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Batch Size (Scans)</label>
                <input type="number" min="1" value={simBatch} onChange={e => setSimBatch(e.target.value)} className="disha-input" style={{ fontSize: 13, fontWeight: 600 }} />
              </div>
              <button onClick={handleSimulate} disabled={simulating || !simHospitalId || !simBatch} className="btn-primary" style={{ whiteSpace: 'nowrap', padding: '9px 16px', fontSize: 13 }}>
                {simulating ? 'Running…' : 'Run Simulation'}
              </button>
            </div>
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
              💡 Tip: After simulation, the leaderboard and bar chart will update on the next refresh.
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}
