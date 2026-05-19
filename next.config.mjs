/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevents page from being embedded in iframes (clickjacking)
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Prevents browser from MIME-sniffing the content type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Enables XSS filter in older browsers
  { key: 'X-XSS-Protection',       value: '1; mode=block' },
  // Controls how much referrer info is included with requests
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Disables access to sensitive browser APIs
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy — restricts where scripts, styles, images can load from
  // 'unsafe-inline' is required for Next.js inline style injection; safe with other restrictions
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-eval needed by Next.js dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' http://localhost:8000",          // mammo-server API calls
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
