'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, RotateCcw } from 'lucide-react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown_error';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #450a0a 0%, #09090b 100%)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#18181b',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#ef4444'
        }}>
          <AlertCircle size={36} />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
          Authentication Failed
        </h1>
        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px', lineHeight: 1.5 }}>
          Error code: <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: '4px', color: '#f87171' }}>{error}</code>
        </p>

        <a
          href="/api/auth/discord"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 20px',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <RotateCcw size={16} />
          <span>Try Again</span>
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
