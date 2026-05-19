'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession } from '@/lib/auth';

/* ── Inline SVG Icon ─────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, stroke = 'currentColor', sw = '1.8' }: { d: string; size?: number; stroke?: string; sw?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard:  'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  hospitals:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zm6 13V12h6v10',
  rounds:     'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  logout:     'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  chevron:    'M9 18l6-6-6-6',
  bell:       'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  shield:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

/* ── DISHA Logo Mark ─────────────────────────────────────────────────────── */
function DishaLogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="36" y2="36">
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

/* ── News Ticker ─────────────────────────────────────────────────────────── */
function Ticker() {
  const text = [
    'DISHA — Diagnostic Imaging & Screening for Health Analytics',
    '🔒 Patient data never leaves hospital nodes · Privacy-first federated learning',
    '📡 FedAvg algorithm aggregates model weights globally · DPDP Act 2023 compliant',
    '🎗️ Early breast cancer detection saves lives · Scan regularly',
    '🏥 Hospital nodes authenticate via secure token-based protocol',
    '⚡ Global model accuracy improves with every FL training round',
  ].join('   ·   ');
  return (
    <div style={{ background: '#07101f', height: 28, display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: '1px solid rgba(245,158,11,0.12)', flexShrink: 0 }}>
      <div style={{ padding: '0 12px', background: '#f59e0b', height: '100%', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#07101f', display: 'inline-block' }} />
        <span style={{ fontSize: 8.5, fontWeight: 900, color: '#07101f', letterSpacing: '1.2px' }}>LIVE</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <span className="ticker-content" style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.2px', paddingLeft: 16 }}>
          {text}
        </span>
      </div>
    </div>
  );
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
function SidebarDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 16px' }} />;
}

/* ── Main Layout ─────────────────────────────────────────────────────────── */
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setName(s.name);
    setEmail(s.email || '');
  }, [router]);

  const logout = () => { clearSession(); router.push('/'); };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard',      icon: ICONS.dashboard, badge: null },
    { href: '/hospitals', label: 'Hospitals',       icon: ICONS.hospitals, badge: null },
    { href: '/rounds',    label: 'Training Rounds', icon: ICONS.rounds,    badge: null },
  ];

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/hospitals': 'Hospital Nodes',
    '/rounds':    'Training Rounds',
  };
  const pageTitle = pageTitles[pathname]
    ?? (pathname.startsWith('/hospitals/') ? 'Hospital Detail' : 'Portal');

  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ══════════════════ SIDEBAR ══════════════════════════════════════════ */}
      <aside style={{
        width: 232,
        background: '#07101f',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, position: 'relative', zIndex: 10,
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}>

        {/* Logo block */}
        <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DishaLogoMark size={34} />
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px', lineHeight: 1 }}>DISHA</div>
              <div style={{ color: 'rgba(245,158,11,0.55)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>Global FL Portal</div>
            </div>
            <div style={{ marginLeft: 'auto', padding: '2px 7px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, fontSize: 8.5, fontWeight: 700, color: 'rgba(245,158,11,0.7)', letterSpacing: '0.5px' }}>v2</div>
          </div>
        </div>

        {/* Nav section */}
        <div style={{ padding: '14px 12px 6px' }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '1.2px', textTransform: 'uppercase', paddingLeft: 4 }}>Main Menu</span>
        </div>

        <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', borderRadius: 8,
                  fontSize: 13.5, fontWeight: isActive ? 600 : 450,
                  color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.42)',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(245,158,11,0.09)' : 'transparent',
                  transition: 'all 0.15s ease',
                  borderLeft: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                  marginBottom: 0,
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.42)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
              >
                <Icon d={link.icon} size={15} stroke={isActive ? '#f59e0b' : 'currentColor'} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Security badge */}
        <div style={{ margin: '0 12px 10px' }}>
          <div style={{ padding: '9px 12px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon d={ICONS.shield} size={13} stroke="#22c55e" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>Secure Session</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>End-to-end encrypted</div>
            </div>
          </div>
        </div>

        <SidebarDivider />

        {/* User */}
        {name && (
          <div style={{ padding: '10px 12px 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 8px', borderRadius: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, #1d4ed8, #1a3a6b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fbbf24', fontWeight: 800, fontSize: 11,
                border: '1px solid rgba(245,158,11,0.2)',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email || 'Global Admin'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '4px 12px 16px' }}>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: 13, fontFamily: 'Inter,sans-serif', transition: 'all 0.15s', fontWeight: 450 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Icon d={ICONS.logout} size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ══════════════════ MAIN CONTENT ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f7fa' }}>

        {/* Top Bar */}
        <header style={{
          height: 54,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #eaecf0',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>DISHA</span>
            <Icon d={ICONS.chevron} size={11} stroke="#cbd5e1" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.1px' }}>{pageTitle}</span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Date */}
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>

            <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />

            {/* Network status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>FL Network Active</span>
            </div>

            <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />

            {/* User avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #1d4ed8, #0f2744)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', fontWeight: 800, fontSize: 11 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{name}</div>
                <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Global Admin</div>
              </div>
            </div>
          </div>
        </header>

        {/* Ticker */}
        <Ticker />

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
          {children}
        </main>

        {/* Footer */}
        <div style={{ padding: '7px 26px', background: 'white', borderTop: '1px solid #eaecf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>DISHA · Diagnostic Imaging &amp; Screening for Health Analytics · © 2026 MoHFW, GoI</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={ICONS.shield} size={10} stroke="#94a3b8" />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Privacy-First · NIC · NHA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
