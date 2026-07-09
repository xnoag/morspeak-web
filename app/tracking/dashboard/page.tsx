'use client'
import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const F = "system-ui,-apple-system,'SF Pro Text',sans-serif"
const M = "'SF Mono','Fira Mono','Cascadia Mono',monospace"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}
function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  return getFirestore(app)
}
function fmtTime(sec?: number) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtDate(ts?: { seconds: number }) {
  if (!ts) return '—'
  const d = new Date(ts.seconds * 1000)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 2) return '어제'
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}
function isActiveToday(ts?: { seconds: number }) {
  if (!ts) return false
  return Date.now() - ts.seconds * 1000 < 86400000
}

type SortKey = 'userName' | 'speakCount' | 'callCount' | 'totalSessionSeconds' | 'lastUpdated'
type Patient = Record<string, any> & { id: string }

const COLS: { key: SortKey; label: string }[] = [
  { key: 'speakCount', label: '말하기' },
  { key: 'callCount', label: '호출' },
  { key: 'totalSessionSeconds', label: '사용 시간' },
  { key: 'lastUpdated', label: '마지막 활동' },
]

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    getDocs(collection(getDb(), 'usageStats'))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)).filter(p => p.userCode)))
      .finally(() => setLoading(false))
  }, [])

  function sort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const filtered = patients
    .filter(p => !search || p.userName?.includes(search) || p.userCode?.includes(search))
    .sort((a, b) => {
      let av: any = sortKey === 'lastUpdated' ? (a.lastUpdated?.seconds ?? 0) : (a[sortKey] ?? 0)
      let bv: any = sortKey === 'lastUpdated' ? (b.lastUpdated?.seconds ?? 0) : (b[sortKey] ?? 0)
      if (sortKey === 'userName') { av = a.userName ?? ''; bv = b.userName ?? '' }
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })

  const activeToday = patients.filter(p => isActiveToday(p.lastUpdated)).length
  const totalSpeak = patients.reduce((s, p) => s + (p.speakCount ?? 0), 0)
  const totalCall  = patients.reduce((s, p) => s + (p.callCount ?? 0), 0)
  const totalSec   = patients.reduce((s, p) => s + (p.totalSessionSeconds ?? 0), 0)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>

      {/* 상단 네비게이션 */}
      <div style={{ height: 56, background: '#1d1d1f', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#007AFF,#5856D6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h5v8H2zM9 2h5v10H9z" fill="white" opacity=".9"/></svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px' }}>Morspeak 트래킹</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* 검색 */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: .4 }} width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="white" strokeWidth="1.5"/><path d="M9 9l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input placeholder="환우 검색..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, paddingRight: 12, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', fontSize: 13, outline: 'none', fontFamily: F, width: 180, color: '#fff' }} />
        </div>
        <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login' }}
          style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: F, color: 'rgba(255,255,255,0.7)' }}>
          로그아웃
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

        {/* 요약 카드 */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: '총 환우', value: `${patients.length}명`, sub: `오늘 활동 ${activeToday}명`, color: '#007AFF', icon: '👤' },
              { label: '누적 말하기', value: totalSpeak.toLocaleString(), sub: '회', color: '#34c759', icon: '💬' },
              { label: '누적 호출', value: totalCall.toLocaleString(), sub: '회', color: '#ff9500', icon: '🔔' },
              { label: '총 사용 시간', value: fmtTime(totalSec), sub: '전체 합산', color: '#5856d6', icon: '⏱' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: c.color, letterSpacing: '-.5px', lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* 환자 테이블 */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* 테이블 헤더 */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>환우 목록</span>
            <span style={{ fontSize: 12, color: '#8e8e93', background: '#f2f2f7', padding: '2px 8px', borderRadius: 20 }}>{filtered.length}명</span>
          </div>

          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>검색 결과 없음</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f2f2f7' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em', width: 40 }}>#</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: sortKey==='userName'?'#007AFF':'#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer' }}
                    onClick={() => sort('userName')}>
                    환우명 {sortKey==='userName'?(sortAsc?'↑':'↓'):''}
                  </th>
                  <th style={{ padding: '10px 8px', width: 20 }} />
                  {COLS.map(c => (
                    <th key={c.key} onClick={() => sort(c.key)} style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: sortKey===c.key?'#007AFF':'#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {c.label} {sortKey===c.key?(sortAsc?'↑':'↓'):''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const active = isActiveToday(p.lastUpdated)
                  return (
                    <tr key={p.id} onClick={() => location.href = `/tracking/patients/${p.userCode}`}
                      style={{ borderBottom: '1px solid #f7f7f7', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9fb')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '13px 20px', color: '#c7c7cc', fontSize: 12, fontFamily: M }}>{i + 1}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1d1d1f' }}>{p.userName || '—'}</div>
                        <div style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M, marginTop: 1 }}>
                          {p.diagnosis ? `${p.diagnosis} · ` : ''}{p.userCode}
                        </div>
                      </td>
                      <td style={{ padding: '13px 8px' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#34c759' : '#d1d1d6', boxShadow: active ? '0 0 0 2px rgba(52,199,89,0.2)' : 'none' }} title={active ? '오늘 활동' : '비활성'} />
                      </td>
                      <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: M, fontSize: 13, fontWeight: 600, color: (p.speakCount??0)>0?'#007AFF':'#d1d1d6' }}>
                        {(p.speakCount??0)>0 ? (p.speakCount??0).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: M, fontSize: 13, color: (p.callCount??0)>0?'#ff9500':'#d1d1d6' }}>
                        {(p.callCount??0)>0 ? (p.callCount??0).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: M, fontSize: 12, color: '#636366' }}>
                        {fmtTime(p.totalSessionSeconds)}
                      </td>
                      <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 12, color: active?'#34c759':'#aeaeb2', fontWeight: active?600:400 }}>
                        {fmtDate(p.lastUpdated)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
