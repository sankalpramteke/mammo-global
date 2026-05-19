'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ── Inline SVG Icon ─────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, stroke = 'currentColor' }: { d: string; size?: number; stroke?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  logout:  'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  portal:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  globe:   'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0c-2.76 0-5 4.48-5 10s2.24 10 5 10 5-4.48 5-10S14.76 2 12 2zm-10 10h20',
};

/* ── DISHA Logo Mark ─────────────────────────────────────────────────────── */
function DishaLogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#hlg)" />
      <defs>
        <linearGradient id="hlg" x1="0" y1="0" x2="36" y2="36">
          <stop stopColor="#1a3a6b" />
          <stop offset="1" stopColor="#0f2744" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="11" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
      <path d="M18 7 A11 11 0 0 1 29 18" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" fill="none" />
      <text x="18" y="22.5" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="800" fontFamily="Inter,sans-serif">D</text>
    </svg>
  );
}

export interface HospitalData {
  hospitalId: string;
  name: string;
  location?: string;
  totalScans: number;
  benignCount: number;
  malignantCount: number;
  roundsParticipated: number;
}

interface HospitalLayoutProps {
  children: React.ReactNode;
}

export default function HospitalLayout({ children }: HospitalLayoutProps) {
  const router = useRouter();
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hospital_token');
    const data  = localStorage.getItem('hospital_data');

    if (!token || !data) {
      // No hospital session → back to login
      router.replace('/');
      return;
    }

    try {
      setHospital(JSON.parse(data));
    } catch {
      localStorage.removeItem('hospital_token');
      localStorage.removeItem('hospital_data');
      router.replace('/');
      return;
    }

    setReady(true);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_data');
    router.push('/');
  };

  // Don't render until auth confirmed (prevents flash of content before redirect)
  if (!ready || !hospital) return null;

  const initials = hospital.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', -apple-system, sans-serif", background: '#f5f7fa' }}>

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header style={{
        background: '#07101f',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 28px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Left: DISHA brand + node indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <DishaLogoMark size={28} />
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '-0.3px', lineHeight: 1 }}>DISHA</div>
              <div style={{ color: 'rgba(245,158,11,0.55)', fontSize: 8.5, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 1 }}>Hospital Node Portal</div>
            </div>
          </Link>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon d={ICONS.portal} size={13} stroke="#f59e0b" />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{hospital.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 5 }}>{hospital.hospitalId}</span>
          </div>
        </div>

        {/* Right: stats + status + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Total Scans</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{hospital.totalScans.toLocaleString()}</div>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>FL Rounds</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{hospital.roundsParticipated}</div>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Online status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>Node Active</span>
          </div>

          {/* Avatar + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #1d4ed8, #0f2744)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', fontWeight: 800, fontSize: 11, border: '1px solid rgba(245,158,11,0.2)' }}>
              {initials}
            </div>
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12.5, fontFamily: 'Inter,sans-serif', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}>
              <Icon d={ICONS.logout} size={13} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Security notice strip ─────────────────────────────────────────── */}
      <div style={{ background: '#0c1a2e', borderBottom: '1px solid rgba(245,158,11,0.1)', padding: '5px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon d={ICONS.shield} size={11} stroke="#22c55e" />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Privacy-First · Patient data never leaves this node · Encrypted weights only</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          DPDP Act 2023 Compliant · FedAvg Protocol
        </div>
      </div>

      {/* ── Page Content ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 28px' }}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 28px', background: 'white', borderTop: '1px solid #eaecf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>DISHA Hospital Node Portal · © 2026 MoHFW, GoI</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Federated Learning · Privacy First · NIC · NHA</span>
      </div>
    </div>
  );
}
