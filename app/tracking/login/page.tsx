'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif"

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}

function AdminLoginForm() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pw }),
    })
    if (res.ok) {
      router.push(searchParams.get('redirect') || '/tracking/dashboard')
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', fontFamily:F }}>
      {/* 좌측 배경 */}
      <div style={{ flex:1, background:'#F7F7F9', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:32, fontWeight:700, color:'#1C1C1E', margin:'0 0 8px' }}>지표SW</p>
          <p style={{ fontSize:15, color:'#8E8E93', margin:0 }}>Morspeak 환자 사용 현황 관리</p>
        </div>
      </div>

      {/* 우측 로그인 */}
      <div style={{ width:440, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px', boxSizing:'border-box' }}>
        <div style={{ width:'100%' }}>
          <p style={{ fontSize:16, fontWeight:700, color:'#1C1C1E', letterSpacing:'-0.2px', marginBottom:20 }}>지표SW 어드민</p>
          <h2 style={{ fontSize:22, fontWeight:600, color:'#000', marginBottom:6 }}>로그인</h2>
          <p style={{ fontSize:14, color:'#8E8E93', marginBottom:36 }}>접근 권한이 있는 팀원만 사용할 수 있습니다.</p>

          <form onSubmit={handleLogin}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>아이디</label>
            <input
              value={id}
              onChange={e => setId(e.target.value)}
              autoComplete="username"
              style={{ width:'100%', padding:'14px 16px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:16, outline:'none', boxSizing:'border-box', fontFamily:F, marginBottom:12, background:'#fff', color:'#000' }}
            />
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#8E8E93', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoComplete="current-password"
              style={{ width:'100%', padding:'14px 16px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:16, outline:'none', boxSizing:'border-box', fontFamily:F, marginBottom:12, background:'#fff', color:'#000' }}
            />

            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'rgba(255,59,48,0.06)', border:'1px solid rgba(255,59,48,0.2)', marginBottom:12 }}>
                <p style={{ fontSize:13, color:'#FF3B30', margin:0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !id || !pw}
              style={{ width:'100%', padding:'15px', borderRadius:10, border:'none', background:'#1C1C1E', color:'#fff', fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:F, opacity: (loading || !id || !pw) ? 0.5 : 1, transition:'opacity 0.15s' }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
