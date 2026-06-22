'use client'
import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const F = "system-ui,-apple-system,'SF Pro Text',sans-serif"
const MONO = "'SF Mono','Fira Mono','Cascadia Mono',monospace"

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
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

type SortKey = 'userName' | 'speakCount' | 'callCount' | 'messageSentCount' | 'lockCount' | 'iotCount' | 'youtubeSelectCount' | 'totalSessionSeconds' | 'lastUpdated'
type Patient = Record<string, any> & { id: string }

const COLS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'userName', label: '환우명', align: 'left' },
  { key: 'speakCount', label: '말하기', align: 'right' },
  { key: 'callCount', label: '호출', align: 'right' },
  { key: 'messageSentCount', label: '문자', align: 'right' },
  { key: 'lockCount', label: '잠금', align: 'right' },
  { key: 'iotCount', label: 'IoT', align: 'right' },
  { key: 'youtubeSelectCount', label: 'YouTube', align: 'right' },
  { key: 'totalSessionSeconds', label: '사용 시간', align: 'right' },
  { key: 'lastUpdated', label: '마지막', align: 'right' },
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

  const total = {
    speak: patients.reduce((s, p) => s + (p.speakCount ?? 0), 0),
    call: patients.reduce((s, p) => s + (p.callCount ?? 0), 0),
    sec: patients.reduce((s, p) => s + (p.totalSessionSeconds ?? 0), 0),
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: F, background: 'linear-gradient(145deg,#e8ecf8 0%,#f2eefa 40%,#eaf5f0 100%)' }}>

      {/* Glass toolbar */}
      <div style={{ height: 52, flexShrink: 0, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', borderBottom: '1px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, boxShadow: '0 1px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#007AFF,#5856D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,122,255,0.35)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.9)"/><rect x="8" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.7)"/><rect x="1" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.7)"/><rect x="8" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.9)"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.3px', color: '#1d1d1f' }}>지표SW</span>
        </div>

        {!loading && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: `${patients.length}명`, sub: '환자' },
              { label: total.speak.toLocaleString(), sub: '말하기' },
              { label: fmtTime(total.sec), sub: '사용시간' },
            ].map(({ label, sub }) => (
              <div key={sub} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', fontSize: 12, color: '#3c3c43' }}>
                <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{label}</span>
                <span style={{ marginLeft: 4, color: '#86868b' }}>{sub}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <input placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', fontSize: 12, outline: 'none', fontFamily: F, width: 130, color: '#1d1d1f' }} />

        <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login' }}
          style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: F, color: '#3c3c43', backdropFilter: 'blur(10px)' }}>
          로그아웃
        </button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 8px 32px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,0.9) inset' }}>

          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#86868b', fontSize: 13 }}>불러오는 중...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                {/* 합계 행 */}
                <tr style={{ background: 'rgba(0,122,255,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '9px 16px', fontSize: 11, fontWeight: 700, color: '#007AFF', textTransform: 'uppercase', letterSpacing: '.06em' }}>합계</td>
                  <td style={{ padding: '9px 16px', textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#007AFF' }}>{total.speak.toLocaleString()}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#1d1d1f' }}>{total.call.toLocaleString()}</td>
                  <td colSpan={5} />
                  <td style={{ padding: '9px 16px', textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: '#86868b' }}>{fmtTime(total.sec)}</td>
                  <td />
                </tr>
                {/* 헤더 */}
                <tr style={{ background: 'rgba(255,255,255,0.4)', borderBottom: '1.5px solid rgba(0,0,0,0.08)' }}>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>#</th>
                  {COLS.map(c => (
                    <th key={c.key} onClick={() => sort(c.key)}
                      style={{ padding: '8px 16px', textAlign: c.align, fontSize: 11, fontWeight: 600, color: sortKey === c.key ? '#007AFF' : '#86868b', textTransform: 'uppercase', letterSpacing: '.06em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {c.label}{sortKey === c.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} onClick={() => location.href = `/tracking/patients/${p.userCode}`}
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,122,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '9px 16px', color: '#c7c7cc', fontSize: 11, fontFamily: MONO }}>{i + 1}</td>
                    <td style={{ padding: '9px 16px', fontWeight: 500, color: '#1d1d1f' }}>
                      {p.userName || '—'}
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#aeaeb2', fontFamily: MONO }}>{p.userCode}</span>
                    </td>
                    <N v={p.speakCount} accent />
                    <N v={p.callCount} />
                    <N v={p.messageSentCount} />
                    <N v={p.lockCount} />
                    <N v={p.iotCount} />
                    <N v={p.youtubeSelectCount} />
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontFamily: MONO, color: '#86868b', fontSize: 12 }}>{fmtTime(p.totalSessionSeconds)}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', color: '#aeaeb2', fontSize: 11 }}>{fmtDate(p.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function N({ v, accent }: { v?: number; accent?: boolean }) {
  const val = v ?? 0
  return (
    <td style={{ padding: '9px 16px', textAlign: 'right', fontFamily: MONO, fontSize: 12, color: val > 0 ? (accent ? '#007AFF' : '#1d1d1f') : '#d1d1d6' }}>
      {val > 0 ? val.toLocaleString() : '—'}
    </td>
  )
}
