'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeAdminRedirect } from '@/lib/admin-navigation';
import './workspace.css';

function LoginForm() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const query = useSearchParams();
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pw }) });
      if (!response.ok) { setError(response.status === 401 ? '아이디 또는 비밀번호가 올바르지 않습니다.' : '로그인하지 못했습니다. 다시 시도해 주세요.'); return; }
      router.replace(safeAdminRedirect(query.get('redirect'))); router.refresh();
    } catch { setError('서버에 연결하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  }
  return <div className="gaon-admin-login"><form onSubmit={login}>
    <div className="brand"><i/>Morspeak</div><h1>관리자 로그인</h1>
    <label htmlFor="admin-id">아이디</label><input id="admin-id" autoComplete="username" value={id} onChange={e => setId(e.target.value)} required/>
    <label htmlFor="admin-password">비밀번호</label><input id="admin-password" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required/>
    {error && <p role="alert">{error}</p>}
    <button disabled={loading || !id || !pw}>{loading ? '로그인 중…' : '로그인'}</button>
  </form></div>;
}
export default function AdminLogin() { return <Suspense><LoginForm/></Suspense>; }
