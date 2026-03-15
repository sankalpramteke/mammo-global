'use client';

export interface AdminSession {
  token: string;
  name: string;
  email: string;
}

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('mammo_global_session');
  return s ? JSON.parse(s) : null;
}

export function setSession(s: AdminSession) {
  localStorage.setItem('mammo_global_session', JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem('mammo_global_session');
}
