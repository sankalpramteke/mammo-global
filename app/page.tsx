'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@mammo.gov.in');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a3a6b 0%, #2c5f9e 60%, #c0392b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 4, padding: '40px 48px', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, background: '#2c5f9e', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 28 }}>🌐</span>
          </div>
          <div style={{ fontSize: 11, color: '#c0392b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Ministry of Health &amp; Family Welfare | Government of India
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a6b', margin: '6px 0 2px' }}>
            National Mammogram AI
          </h1>
          <div style={{ fontSize: 13, color: '#555' }}>Global FL Admin Dashboard</div>
        </div>

        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 3, padding: '8px 14px', fontSize: 12, color: '#856404', marginBottom: 24 }}>
          🔐 Restricted Access — Authorized Personnel Only
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Admin Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ccd', borderRadius: 3, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #ccd', borderRadius: 3, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#7a9fc7' : '#2c5f9e', color: 'white', border: 'none', borderRadius: 3, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#888' }}>
          First login? Use any email + choose a password to create your admin account.
        </div>
      </div>
    </div>
  );
}
