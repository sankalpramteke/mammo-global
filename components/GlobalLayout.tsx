'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession } from '@/lib/auth';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push('/'); return; }
    setName(s.name);
  }, [router]);

  function logout() { clearSession(); router.push('/'); }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/hospitals', label: 'Hospitals' },
    { href: '/rounds', label: 'Training Rounds' },
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif', background: '#f0f4f8' }}>
      {/* Top Header */}
      <div style={{ background: '#1a3a6b', color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#aac4e8', letterSpacing: 0.5 }}>Ministry of Health &amp; Family Welfare | Government of India</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>National Mammogram AI — Global FL Dashboard</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#aac4e8' }}>Admin: {name}</span>
          <button onClick={logout} style={{ background: '#c0392b', color: 'white', border: 'none', borderRadius: 3, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>
      </div>

      {/* News Ticker */}
      <div style={{ background: '#e67e22', color: 'white', fontSize: 12, padding: '5px 24px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 600 }}>NOTICE: &nbsp;</span>
        Global model weights are never stored with patient data. Only aggregated model parameters are transmitted. Federated Learning ensures complete data privacy across all hospital nodes.
      </div>

      {/* Navbar */}
      <div style={{ background: '#2c5f9e', display: 'flex', padding: '0 24px' }}>
        {navLinks.map(link => (
          <Link key={link.href} href={link.href}
            style={{
              color: 'white', textDecoration: 'none', padding: '11px 18px', fontSize: 13, fontWeight: 600,
              background: pathname === link.href ? '#e67e22' : 'transparent',
              borderBottom: pathname === link.href ? '3px solid #fff' : '3px solid transparent',
              display: 'inline-block',
            }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Page Content */}
      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ background: '#1a3a6b', color: '#aac4e8', textAlign: 'center', padding: '16px', fontSize: 12, marginTop: 40, borderTop: '4px solid #e67e22' }}>
        © 2026 Ministry of Health &amp; Family Welfare, Government of India &nbsp;|&nbsp; National Informatics Centre (NIC) | National Health Authority (NHA)
      </footer>
    </div>
  );
}
