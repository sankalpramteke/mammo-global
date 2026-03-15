'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import dynamic from 'next/dynamic';

// Dynamically import IndiaMap with SSR disabled (Leaflet requires window)
const IndiaMap = dynamic(() => import('@/components/IndiaMap'), { 
  ssr: false,
  loading: () => <div style={{ height: 400, background: '#eef2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading Map...</div>
});

interface Round { roundNumber: number; accuracy: number; participants: number; modelVersion: string; completedAt: string; }
interface Hospital { _id: string; hospitalId: string; name: string; status: string; totalScans: number; roundsParticipated: number; lastSeen: string; lat: number; lng: number; location: string }
interface Stats   { totalScans: number; totalBenign: number; totalMalignant: number; }

const COLORS = ['#155724', '#721c24', '#2c5f9e']; // Benign (Green), Malignant (Red), Unknown (Blue)

export default function DashboardPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<Stats>({ totalScans: 0, totalBenign: 0, totalMalignant: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    const s = getSession();
    if (!s) return;
    
    try {
      const headers = { Authorization: `Bearer ${s.token}` };
      const [rRes, hRes, sRes] = await Promise.all([
        fetch('/api/rounds', { headers }),
        fetch('/api/hospitals', { headers }),
        fetch('/api/stats', { headers })
      ]);
      const rData = await rRes.json();
      const hData = await hRes.json();
      const sData = await sRes.json();
      
      setRounds(rData.rounds || []);
      setHospitals(hData.hospitals || []);
      if (sData.stats) setStats(sData.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(() => fetchData(true), 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const latestRound = rounds[rounds.length - 1];
  const onlineCount = hospitals.filter(h => h.status === 'online').length;
  const chartData = rounds.map(r => ({ round: `R${r.roundNumber}`, accuracy: +(r.accuracy * 100).toFixed(1) }));
  
  const pieData = [
    { name: 'Benign', value: stats.totalBenign },
    { name: 'Malignant', value: stats.totalMalignant },
  ].filter(d => d.value > 0);
  
  if (pieData.length === 0) pieData.push({ name: 'No Data', value: 1 }); // Fallback empty state

  const cards = [
    { label: 'Total Hospitals', value: hospitals.length, icon: '🏥', color: '#1a3a6b' },
    { label: 'Online Now', value: onlineCount, icon: '🟢', color: '#155724' },
    { label: 'FL Rounds', value: rounds.length, icon: '🔄', color: '#2c5f9e' },
    { label: 'Latest Accuracy', value: latestRound ? `${(latestRound.accuracy * 100).toFixed(1)}%` : 'N/A', icon: '🎯', color: '#856404' },
  ];

  return (
    <GlobalLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1a3a6b', fontSize: 22, fontWeight: 700, margin: 0 }}>
          🌐 Global Federated Learning Dashboard
        </h2>
        <button onClick={() => fetchData(false)} disabled={loading || refreshing}
          style={{ background: '#fff', border: '1px solid #ccd', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: (loading || refreshing) ? 0.6 : 1 }}>
          <span style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>🔄</span> {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: 'white', borderRadius: 4 }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
          Loading Global Model Data...
        </div>
      ) : (
        <>
          {/* Top 4 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            {cards.map(card => (
              <div key={card.label} style={{ background: card.color, color: 'white', borderRadius: 6, padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 32, opacity: 0.15, position: 'absolute', right: -10, bottom: -10, transform: 'scale(2.5)' }}>{card.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 8, letterSpacing: 0.5 }}>{card.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Accuracy Line Chart */}
            <div style={{ background: 'white', borderRadius: 6, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ color: '#1a3a6b', fontSize: 16, fontWeight: 700, margin: 0 }}>📈 Model Accuracy Progression</h3>
                <span style={{ fontSize: 12, color: '#888' }}>Updates after every FL round</span>
              </div>
              
              {chartData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13, background: '#f8f9fa', borderRadius: 4 }}>No training rounds yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="round" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Accuracy']} contentStyle={{ borderRadius: 4, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#e67e22" strokeWidth={3} dot={{ r: 4, fill: '#e67e22', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Distribution Pie Chart */}
            <div style={{ background: 'white', borderRadius: 6, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: '#1a3a6b', fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>📊 Global Prediction Distribution</h3>
              <div style={{ flex: 1, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#eee' : COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Scans']} contentStyle={{ borderRadius: 4, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#666', borderTop: '1px solid #eee', paddingTop: 12 }}>
                Total Scans Analyzed Globally: <strong>{stats.totalScans}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* India Map Component */}
            <div style={{ background: 'white', borderRadius: 6, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ color: '#1a3a6b', fontSize: 15, fontWeight: 700, margin: 0 }}>📍 Node Distribution (India)</h3>
              </div>
              <IndiaMap hospitals={hospitals} />
            </div>

            {/* Recent Hospitals Table */}
            <div style={{ background: 'white', borderRadius: 6, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#1a3a6b', fontSize: 15, fontWeight: 700, margin: 0 }}>🏥 Active Hospital Nodes</h3>
                <span style={{ fontSize: 11, background: '#eef2f8', padding: '3px 8px', borderRadius: 2 }}>Top 5</span>
              </div>
              
              {hospitals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13, background: '#f8f9fa', borderRadius: 4, flex: 1 }}>No hospitals connected yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="gov-table" style={{ fontSize: 12 }}>
                    <thead><tr><th>Hospital</th><th>ID</th><th>Status</th><th>Rounds</th></tr></thead>
                    <tbody>{hospitals.slice(0, 5).map(h => (
                      <tr key={h._id}>
                        <td style={{ fontWeight: 600 }}>{h.name}</td>
                        <td><code style={{ background: '#f0f4f8', padding: '2px 4px', borderRadius: 2, fontSize: 11 }}>{h.hospitalId}</code></td>
                        <td><span className={h.status === 'online' ? 'badge-online' : 'badge-offline'} style={{ fontSize: 10 }}>{h.status}</span></td>
                        <td style={{ textAlign: 'center' }}>{h.roundsParticipated}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </GlobalLayout>
  );
}
