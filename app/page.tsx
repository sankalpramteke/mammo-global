'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ── Stats for left panel ────────────────────────────────────────────────── */
const STATS = [
  { num: '1,40,000+', label: 'New breast cancer cases annually in India',  color: '#ef4444' },
  { num: 'FedAvg',    label: 'Privacy-preserving weight aggregation',       color: '#f59e0b' },
  { num: '100%',      label: 'Patient data stays within hospital nodes',    color: '#22c55e' },
  { num: 'DPDP',      label: 'Act 2023 — compliant data handling',          color: '#818cf8' },
];

/* ── DISHA SVG Logo ──────────────────────────────────────────────────────── */
function DishaLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="14" fill="url(#loginLg)" />
      <defs>
        <linearGradient id="loginLg" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#1a3a6b" />
          <stop offset="1" stopColor="#0f2744" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="14" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
      <path d="M24 10 A14 14 0 0 1 38 24" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <text x="24" y="29" textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="900" fontFamily="Inter,sans-serif">D</text>
    </svg>
  );
}

type Tab = 'admin' | 'hospital';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('admin');

  // Admin State
  const [email, setEmail]             = useState('admin@mammo.gov.in');
  const [adminPassword, setAdminPassword] = useState('');

  // Hospital State
  const [hospitalEmail, setHospitalEmail]       = useState('');
  const [hospitalId, setHospitalId]             = useState('');
  const [hospitalPassword, setHospitalPassword] = useState('');
  const [useEmailLogin, setUseEmailLogin]       = useState(true); // default: email (mammo-client creds)

  const [loading, setLoading] = useState(false);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setSession({ token: data.token, name: data.name, email: data.email });
      toast.success('Welcome, ' + data.name);
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleHospitalLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = useEmailLogin
        ? { email: hospitalEmail, password: hospitalPassword }          // mammo-client credentials
        : { hospitalId: hospitalId.trim(), password: hospitalPassword }; // legacy portal ID

      const res = await fetch('/api/hospital-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('hospital_token', data.token);
      localStorage.setItem('hospital_data', JSON.stringify(data.hospital));
      toast.success(`Connected: ${data.hospital.name}`);
      window.location.href = '/hospitals/portal';
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hospital login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh', overflow: 'hidden', display: 'flex',
      fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc',
    }}>

      {/* ══════════════ LEFT PANEL — Branding ══════════════ */}
      <div style={{
        flex: '0 0 50%',
        background: 'linear-gradient(145deg, #0f2744 0%, #1a3a6b 50%, #1e4d8c 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(245,158,11,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(29,78,216,0.15)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <DishaLogo size={48} />
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 24, letterSpacing: '-0.8px', lineHeight: 1 }}>DISHA</div>
            <div style={{ color: 'rgba(245,158,11,0.7)', fontSize: 9, letterSpacing: '1.5px', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>Diagnostic Imaging &amp; Screening for Health Analytics</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.04em' }}>
            Global<br />
            <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Federated
            </span>
            <br />Learning Network
          </h1>
          <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #f59e0b, transparent)', borderRadius: 2, marginBottom: 14 }} />
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 360 }}>
            <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Privacy-first AI for national health.</strong>{' '}
            Aggregate intelligence from hospital nodes across India — without ever exposing patient data.
          </p>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 36 }}>
          {STATS.map(s => (
            <div key={s.num} style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderLeft: `3px solid ${s.color}`,
              borderRadius: 8,
            }}>
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 17, lineHeight: 1 }}>{s.num}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{ position: 'absolute', bottom: 20, left: 56, right: 56 }}>
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10.5 }}>
            DISHA · © 2026 MoHFW, GoI · NIC · NHA · Restricted Access
          </p>
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL — Login Form ══════════════ */}
      <div style={{
        flex: '0 0 50%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: '#f8fafc',
        backgroundImage: 'radial-gradient(circle, rgba(15,39,68,0.13) 1.2px, transparent 1.2px)',
        backgroundSize: '28px 28px',
        padding: '0 48px', overflow: 'hidden', position: 'relative',
      }}>

        {/* Vignette */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(248,250,252,0.92) 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <DishaLogo size={44} />
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', margin: '12px 0 0', letterSpacing: '-0.5px' }}>Sign in to DISHA</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 5 }}>Global FL Admin &amp; Hospital Node Authentication</p>
          </div>

          {/* Restricted access banner */}
          <div style={{ marginBottom: 18, padding: '9px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: 11.5, color: '#713f12', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>🔐</span> Restricted Access — Authorised Personnel Only
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['admin', 'hospital'] as Tab[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: 700,
                  border: 'none', cursor: 'pointer', borderRadius: 8,
                  fontFamily: 'Inter, sans-serif', letterSpacing: '0.3px',
                  transition: 'all 0.2s',
                  background: activeTab === t ? 'white' : 'transparent',
                  color: activeTab === t ? '#0f2744' : '#94a3b8',
                  boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>
                {t === 'admin' ? '🛡️ Global Admin' : '🏥 Hospital Node'}
              </button>
            ))}
          </div>

          {/* ── Admin Login Form ── */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Admin Email</label>
                <input id="adminEmail" className="disha-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Password</label>
                <input id="adminPassword" className="disha-input" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required placeholder="Enter password" />
              </div>
              <button id="adminLoginBtn" type="submit" disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 4 }}>
                {loading ? 'Authenticating...' : 'Sign In as Admin →'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                First login? Use any email + choose a password to create your admin account.
              </div>
            </form>
          )}

          {/* ── Hospital Login Form ── */}
          {activeTab === 'hospital' && (
            <form onSubmit={handleHospitalLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Login mode info banner */}
              <div style={{ padding: '9px 12px', background: useEmailLogin ? '#eff6ff' : '#f8fafc', border: `1px solid ${useEmailLogin ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 8, fontSize: 12, color: useEmailLogin ? '#1d4ed8' : '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{useEmailLogin ? '📧' : '🔑'}</span>
                <span>{useEmailLogin ? 'Using your DISHA client (mammo-client) credentials' : 'Using Hospital Node ID (portal-registered)'}</span>
                <button type="button" onClick={() => setUseEmailLogin(!useEmailLogin)}
                  style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter,sans-serif' }}>
                  Switch to {useEmailLogin ? 'Hospital ID' : 'Email login'}
                </button>
              </div>

              {/* Email login (default — mammo-client credentials) */}
              {useEmailLogin ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>DISHA Client Email</label>
                  <input id="hospitalEmail" className="disha-input" type="email" value={hospitalEmail}
                    onChange={e => setHospitalEmail(e.target.value)} required
                    placeholder="Email you used in mammo-client" />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Same email &amp; password as your DISHA client account</div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Hospital Node ID</label>
                  <input id="hospitalId" className="disha-input" type="text" value={hospitalId}
                    onChange={e => setHospitalId(e.target.value)} required
                    placeholder="e.g. AIIMS_NAGPUR" />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Password</label>
                <input id="hospitalPassword" className="disha-input" type="password" value={hospitalPassword}
                  onChange={e => setHospitalPassword(e.target.value)} required
                  placeholder={useEmailLogin ? 'Your DISHA client password' : 'Node access password'} />
              </div>

              <button id="hospitalLoginBtn" type="submit" disabled={loading} className="btn-amber"
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 4 }}>
                {loading ? 'Connecting…' : 'Connect Hospital Node →'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                New hospital?{' '}
                <Link href="/hospitals/register" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>
                  Register your hospital node
                </Link>
              </div>
            </form>
          )}

          {/* Status badge */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>System Online · Secure Connection · FL Network Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
