'use client';
import { useEffect, useState, useCallback } from 'react';
import GlobalLayout from '@/components/GlobalLayout';
import { getSession } from '@/lib/auth';

interface Hospital { _id: string; hospitalId: string; name: string; location: string; status: string; totalScans: number; roundsParticipated: number; lastSeen: string; createdAt: string; }

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

  return (
    <GlobalLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1a3a6b', fontSize: 20, fontWeight: 700, margin: 0 }}>🏥 Connected Hospital Nodes</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ background: '#d4edda', color: '#155724', padding: '4px 14px', borderRadius: 3, fontSize: 12, fontWeight: 600, border: '1px solid #c3e6cb' }}>
            🟢 {online} Online
          </span>
          <span style={{ background: '#f8d7da', color: '#721c24', padding: '4px 14px', borderRadius: 3, fontSize: 12, fontWeight: 600, border: '1px solid #f5c6cb' }}>
            🔴 {hospitals.length - online} Offline
          </span>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading hospitals…</div>
        ) : hospitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: 14 }}>No hospitals registered yet.</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Start mammo-server at a hospital to register it here.</div>
          </div>
        ) : (
          <table className="gov-table">
            <thead>
              <tr>
                <th>#</th><th>Hospital Name</th><th>Hospital ID</th><th>Location</th>
                <th>Status</th><th>Rounds Participated</th><th>Last Seen</th><th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h, i) => (
                <tr key={h._id}>
                  <td>{i + 1}</td>
                  <td><strong>{h.name}</strong></td>
                  <td><code style={{ fontSize: 11, background: '#f0f4f8', padding: '2px 6px', borderRadius: 2 }}>{h.hospitalId}</code></td>
                  <td>{h.location || '—'}</td>
                  <td><span className={h.status === 'online' ? 'badge-online' : 'badge-offline'}>{h.status.toUpperCase()}</span></td>
                  <td style={{ textAlign: 'center' }}>{h.roundsParticipated}</td>
                  <td style={{ fontSize: 12 }}>{new Date(h.lastSeen).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: 12 }}>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#888', textAlign: 'right' }}>
        Hospitals register automatically when mammo-server starts. Status updates every 60 seconds.
      </div>
    </GlobalLayout>
  );
}
