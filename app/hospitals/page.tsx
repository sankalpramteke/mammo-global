'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';

interface Hospital {
  _id: string; hospitalId: string; name: string; location: string;
  status: string; totalScans: number; roundsParticipated: number;
  lastSeen: string; createdAt: string;
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHospitals = useCallback(async () => {
    const s = getSession();
    if (!s) return;
    const res = await fetch('/api/hospitals', { headers: { Authorization: `Bearer ${s.token}` } });
    const data = await res.json();
    setHospitals(data.hospitals || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHospitals(); }, [fetchHospitals]);

  const online = hospitals.filter(h => h.status === 'online').length;
  const offline = hospitals.length - online;

  return (
    <GlobalLayout>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Hospital Nodes</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Hospitals register automatically when mammo-server starts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge-online" style={{ fontSize: 12, padding: '5px 14px' }}>{online} Online</span>
          <span className="badge-offline" style={{ fontSize: 12, padding: '5px 14px' }}>{offline} Offline</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header">Hospital Registry</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading hospitals…
          </div>
        ) : hospitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>No hospitals registered yet.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Start mammo-server at a hospital to register it here.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="disha-table">
              <thead><tr>
                <th>#</th><th>Hospital Name</th><th>Hospital ID</th><th>Location</th>
                <th>Status</th><th>Total Scans</th><th>Rounds</th><th>Last Seen</th><th>Registered</th>
              </tr></thead>
              <tbody>
                {hospitals.map((h, i) => (
                  <tr key={h._id}>
                    <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#0f2744' }}>{h.name}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#475569' }}>{h.hospitalId}</code></td>
                    <td style={{ color: '#64748b' }}>{h.location || '—'}</td>
                    <td><span className={h.status === 'online' ? 'badge-online' : 'badge-offline'}>{h.status.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 700, color: '#f59e0b' }}>{h.totalScans.toLocaleString()}</td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{h.roundsParticipated}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{new Date(h.lastSeen).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
        Status updates every 60 seconds · Hospitals self-register on mammo-server startup
      </div>
    </GlobalLayout>
  );
}
