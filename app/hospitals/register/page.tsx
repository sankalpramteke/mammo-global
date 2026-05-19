'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

function DishaLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="24" cy="24" r="17" stroke="#f59e0b" strokeWidth="2" fill="rgba(245,158,11,0.1)" />
      <path d="M 24 7 A 17 17 0 0 1 41 24" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="24" y1="2" x2="24" y2="6" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="24" x2="42" y2="24" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="46" x2="24" y2="42" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="24" x2="6" y2="24" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <text x="24" y="29" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="800" fontFamily="Inter,sans-serif">G</text>
    </svg>
  );
}

const FEATURES = [
  { icon: '🔒', title: 'Privacy First', desc: 'Patient data never leaves your hospital' },
  { icon: '🌐', title: 'Global Network', desc: 'Contribute to India-wide AI model' },
  { icon: '🎯', title: '92.1% Accuracy', desc: 'Validated on CBIS-DDSM dataset' },
  { icon: '⚡', title: 'FedAvg', desc: 'Weighted federated aggregation' },
];

export default function HospitalRegistration() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/hospital-auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, hospitalId, location, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('hospital_token', data.token);
      localStorage.setItem('hospital_data', JSON.stringify(data.hospital));
      toast.success('Registration successful. Welcome to the Global Network!');
      window.location.href = '/hospitals/portal';
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc' }}>
      {/* Left Panel */}
      <div style={{ flex: '0 0 50%', background: 'linear-gradient(145deg, #0f2744 0%, #1a3a6b 50%, #1e4d8c 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,158,11,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(29,78,216,0.15)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <DishaLogo size={44} />
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, letterSpacing: '-0.6px', lineHeight: 1 }}>DISHA</div>
            <div style={{ color: 'rgba(245,158,11,0.65)', fontSize: 8.5, letterSpacing: '1.2px', marginTop: 3, textTransform: 'uppercase', fontWeight: 600 }}>Diagnostic Imaging &amp; Screening · MoHFW</div>
          </div>
        </div>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.03em' }}>
            Join the<br />
            <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FL Network</span>
          </h1>
          <div style={{ width: 48, height: 3, background: 'linear-gradient(90deg, #f59e0b, transparent)', borderRadius: 2, marginBottom: 16 }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 380 }}>
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Register your hospital as a federated learning node.</strong><br />
            Contribute to national breast cancer screening AI while keeping all patient data on-premises.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
              <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>{f.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 56 }}>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10.5 }}>DISHA · © 2026 MoHFW, GoI · NIC · NHA</p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', backgroundImage: 'radial-gradient(circle, rgba(15,39,68,0.13) 1.2px, transparent 1.2px)', backgroundSize: '28px 28px', padding: '0 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(248,250,252,0.92) 100%)', pointerEvents: 'none' }} />
        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #0f2744, #1a3a6b)', marginBottom: 16 }}>
              <DishaLogo size={28} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', margin: 0, letterSpacing: '-0.5px' }}>Register Hospital Node</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Join the Global Federated Learning Network</p>
          </div>

          {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>{error}</div>}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Hospital Full Name', id: 'regName', value: name, set: setName, placeholder: 'e.g. Apollo Hospital Delhi', type: 'text' },
              { label: 'Node Identifier ID', id: 'regId', value: hospitalId, set: setHospitalId, placeholder: 'e.g. APOLLO_DELHI', type: 'text' },
              { label: 'City / Location', id: 'regLocation', value: location, set: setLocation, placeholder: 'e.g. New Delhi, India', type: 'text' },
              { label: 'Node Access Password', id: 'regPassword', value: password, set: setPassword, placeholder: 'Create a secure password', type: 'password' },
            ].map(f => (
              <div key={f.id}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{f.label}</label>
                <input id={f.id} type={f.type} required value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className="disha-input" />
              </div>
            ))}
            <button id="registerBtn" type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 4 }}>
              {loading ? '⏳ Registering Node...' : '🌐 Register Hospital Node →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            Already registered?{' '}
            <Link href="/" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Go back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
