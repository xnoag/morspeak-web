'use client';
import { useState } from 'react';
import { sendLoginLink } from '@/lib/receiptAuth';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendLoginLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F8', fontFamily: F }}>
      <div style={{ width: 360, background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>증빙자료 아카이빙</h1>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>아산나눔재단 지원사업</p>

        {sent ? (
          <div style={{ marginTop: 24, fontSize: 14, color: '#1C1C1E', lineHeight: 1.6 }}>
            <b>{email}</b>로 로그인 링크를 보냈습니다.<br />메일함을 확인해서 링크를 클릭해주세요.
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 24 }}>
            <input
              type="email" required placeholder="이메일 주소" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E5EA', fontSize: 14, fontFamily: F, boxSizing: 'border-box' }}
            />
            {error && <div style={{ color: '#CC2200', fontSize: 12, marginTop: 8 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 10, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? '전송 중…' : '로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
