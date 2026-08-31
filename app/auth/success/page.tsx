'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const discordId = searchParams.get('discordId');
  const username = searchParams.get('username');
  const avatar = searchParams.get('avatar');

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Notify window.opener if opened via popup window
    if (window.opener && token) {
      window.opener.postMessage(
        {
          type: 'SUSHI_AUTH_SUCCESS',
          payload: { token, discordId, username, avatar },
        },
        '*'
      );
    }
  }, [token, discordId, username, avatar]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #09090b 100%)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}>
            <img src="/sushi_logo_without_bg.png" alt="Sushi Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          </div>

          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <CheckCircle2 size={32} />
          </div>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Authentication Successful
        </h1>
        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px', lineHeight: 1.5 }}>
          Welcome, <strong style={{ color: '#f4f4f5' }}>{username || 'Discord User'}</strong>! Your session is now connected with Sushi Auto-Buyer.
        </p>

        {avatar && (
          <div style={{ marginBottom: '20px' }}>
            <img
              src={avatar}
              alt={username || 'Avatar'}
              style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #6366f1' }}
            />
          </div>
        )}

        <div style={{
          background: '#27272a',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left'
        }}>
          <ShieldCheck size={24} color="#6366f1" style={{ flexShrink: 0 }} />
          <span>You can now close this tab and return to the Sushi extension popup.</span>
        </div>

        <button
          onClick={() => window.close()}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>Close This Window</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>}>
      <AuthSuccessContent />
    </Suspense>
  );
}
