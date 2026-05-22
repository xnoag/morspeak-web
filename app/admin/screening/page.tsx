'use client';

import { useState } from 'react';
import { collection, getDocs, orderBy, query, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Status = '미검토' | '적합' | '부적합' | '재요청';

interface BlinkAttempt {
  step: 'short' | 'long' | 'mixed';
  attempt: number;
  duration: number;
  success: boolean;
  patternIndex?: number;
  expected?: 'short' | 'long';
}

interface Result {
  id: string;
  patientName: string;
  caregiverName: string;
  caregiverContact: string;
  region: string;
  subRegion: string;
  communicationMethod: string;
  videoUrl: string | null;
  videoUrls?: { short?: string; long?: string; mixed?: string } | null;
  deviceType: string | null;
  status?: Status;
  createdAt: { seconds: number } | null;
  blinkLog?: BlinkAttempt[] | null;
  skippedSteps?: string[] | null;
  dotDashBoundary?: number;
}

const ADMIN_PW = 'Hgo3575425*';
const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

const STATUS: Record<Status, { bg: string; color: string; dot: string }> = {
  '미검토': { bg: '#F2F2F7', color: '#8E8E93', dot: '#C7C7CC' },
  '적합':   { bg: '#D4F5DF', color: '#1A8C3A', dot: '#34C759' },
  '부적합': { bg: '#FFE0DE', color: '#CC2200', dot: '#FF3B30' },
  '재요청': { bg: '#FFF0D4', color: '#CC7000', dot: '#FF9500' },
};
const STEP: Record<string, string> = { short: '짧게', long: '길게', mixed: '혼합' };

export default function AdminScreeningPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'screening_results'), orderBy('createdAt', 'desc')));
    setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
    setLoading(false);
  };

  const login = async () => {
    if (pw !== ADMIN_PW) { setError('비밀번호가 틀렸습니다.'); return; }
    setLoading(true); setError('');
    try { await load(); setAuthed(true); }
    catch { setError('Firestore 연결 오류.'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: Status) => {
    await updateDoc(doc(db, 'screening_results', id), { status });
    setResults(r => r.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteResult = async (id: string) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'screening_results', id));
    setResults(r => r.filter(x => x.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const exportCSV = () => {
    const h = ['날짜','상태','환우명','보호자','연락처','지역','소통방법','기기'];
    const rows = results.map(r => [
      r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleString('ko-KR') : '-',
      r.status ?? '미검토', r.patientName, r.caregiverName, r.caregiverContact,
      r.subRegion ? `${r.region} ${r.subRegion}` : r.region,
      r.communicationMethod ?? '', r.deviceType ?? '',
    ]);
    const csv = [h, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'morspeak_screening.csv'; a.click();
  };

  const fmt = (r: Result) => r.createdAt
    ? new Date(r.createdAt.seconds*1000).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})
    : '-';

  const filtered = results.filter(r =>
    !search || r.patientName?.includes(search) || r.caregiverName?.includes(search) || r.caregiverContact?.includes(search)
  );

  // ── 로그인 화면 ──────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'#F7F7F9', display:'flex', alignItems:'center', justifyContent:'center', fontFamily: F }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'48px 40px', maxWidth:380, width:'100%', margin:'0 20px', boxShadow:'0 4px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'#1C1C1E', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a5 5 0 0 1 5 5v1h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0-7a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z" fill="#fff"/></svg>
        </div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#000', marginBottom:4 }}>모스픽 어드민</h1>
        <p style={{ fontSize:14, color:'#8E8E93', marginBottom:28 }}>내부 관계자만 접근 가능합니다</p>
        <input type="password" placeholder="비밀번호" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter'&&login()}
          style={{ width:'100%', padding:'14px 16px', border:'1.5px solid #E5E5EA', borderRadius:14, fontSize:16, outline:'none', boxSizing:'border-box', fontFamily:F, marginBottom:10 }} />
        {error && <p style={{ color:'#FF3B30', fontSize:13, marginBottom:8 }}>{error}</p>}
        <button onClick={login} disabled={loading}
          style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:'#1C1C1E', color:'#fff', fontSize:16, fontWeight:600, cursor:'pointer', fontFamily:F }}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </div>
    </div>
  );

  const total = results.length;
  const fit   = results.filter(r => r.status === '적합').length;
  const unfit = results.filter(r => r.status === '부적합').length;
  const retry = results.filter(r => r.status === '재요청').length;
  const pending = results.filter(r => !r.status || r.status === '미검토').length;

  // ── 메인 화면 ──────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#F7F7F9', fontFamily: F }}>

      {/* 헤더 */}
      <div style={{ background:'rgba(255,255,255,0.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'16px 28px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:18, fontWeight:700, color:'#000' }}>모스픽 적합성 검사</span>
            <span style={{ fontSize:13, color:'#8E8E93' }}>총 {total}명</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input placeholder="이름·연락처 검색" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding:'8px 14px', border:'1.5px solid #E5E5EA', borderRadius:10, fontSize:13, outline:'none', fontFamily:F, width:160 }} />
            <button onClick={load} disabled={loading}
              style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E5E5EA', background:'#fff', color:'#3C3C43', fontSize:13, cursor:'pointer', fontFamily:F }}>
              {loading ? '…' : '↻ 새로고침'}
            </button>
            <button onClick={exportCSV}
              style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E5E5EA', background:'#fff', color:'#3C3C43', fontSize:13, cursor:'pointer', fontFamily:F }}>
              CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 28px' }}>

        {/* 통계 카드 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'미검토', count: pending, color:'#8E8E93', bg:'#F2F2F7' },
            { label:'적합',   count: fit,     color:'#1A8C3A', bg:'#D4F5DF' },
            { label:'부적합', count: unfit,   color:'#CC2200', bg:'#FFE0DE' },
            { label:'재요청', count: retry,   color:'#CC7000', bg:'#FFF0D4' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} style={{ background:'#fff', borderRadius:16, padding:'16px 20px', border:'1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize:12, color:'#8E8E93', marginBottom:4 }}>{label}</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ fontSize:28, fontWeight:700, color }}>{count}</span>
                <span style={{ fontSize:12, color:'#C7C7CC' }}>/{total}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ background:'#fff', borderRadius:20, border:'1px solid rgba(0,0,0,0.06)', overflow:'hidden' }}>

          {/* 컬럼 헤더 */}
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 120px 90px 90px 60px 36px', gap:0, padding:'10px 20px', borderBottom:'1px solid #F2F2F7', fontSize:11, fontWeight:600, color:'#8E8E93', letterSpacing:'0.04em', textTransform:'uppercase' as const }}>
            <span>날짜</span><span>환우 · 보호자</span><span>지역 · 소통</span>
            <span>상태</span><span>로그</span><span>영상</span><span>기기</span><span/>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding:'60px', textAlign:'center', color:'#C7C7CC', fontSize:14 }}>결과가 없습니다</div>
          )}

          {filtered.map((r, i) => {
            const isOpen = expandedId === r.id;
            const s = r.status ?? '미검토';
            const hasLog = r.blinkLog && r.blinkLog.length > 0;
            const hasVideo = !!(r.videoUrl || r.videoUrls);
            const log = r.blinkLog ?? [];
            const skipped = r.skippedSteps ?? [];

            const shortAttempts = log.filter(a => a.step === 'short');
            const longAttempts  = log.filter(a => a.step === 'long');
            const shortAvg = shortAttempts.filter(a=>a.success).length > 0
              ? (shortAttempts.filter(a=>a.success).reduce((s,a)=>s+a.duration,0)/shortAttempts.filter(a=>a.success).length).toFixed(3) : null;
            const longAvg = longAttempts.filter(a=>a.success).length > 0
              ? (longAttempts.filter(a=>a.success).reduce((s,a)=>s+a.duration,0)/longAttempts.filter(a=>a.success).length).toFixed(3) : null;

            const videoEntries: [string, string][] = r.videoUrls
              ? (['short','long','mixed'] as const).filter(k => r.videoUrls?.[k]).map(k => [k, r.videoUrls![k]!])
              : r.videoUrl ? [['recording', r.videoUrl]] : [];

            return (
              <div key={r.id}>
                {/* 행 */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                  style={{
                    display:'grid', gridTemplateColumns:'80px 1fr 1fr 120px 90px 90px 60px 36px',
                    gap:0, padding:'14px 20px', cursor:'pointer',
                    borderTop: i > 0 ? '1px solid #F7F7F9' : 'none',
                    background: isOpen ? '#F7F7F9' : 'transparent',
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='#FAFAFA'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isOpen ? '#F7F7F9' : 'transparent'; }}
                >
                  <span style={{ fontSize:13, color:'#8E8E93', alignSelf:'center' }}>{fmt(r)}</span>

                  <div style={{ alignSelf:'center' }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'#000', marginBottom:1 }}>{r.patientName}</p>
                    <p style={{ fontSize:12, color:'#8E8E93' }}>{r.caregiverName}</p>
                  </div>

                  <div style={{ alignSelf:'center' }}>
                    <p style={{ fontSize:13, color:'#3C3C43' }}>{r.subRegion ? `${r.region} ${r.subRegion}` : r.region}</p>
                    <p style={{ fontSize:12, color:'#8E8E93' }}>{r.communicationMethod || '-'}</p>
                  </div>

                  {/* 상태 — 인라인 클릭 변경 */}
                  <div style={{ alignSelf:'center' }} onClick={e => e.stopPropagation()}>
                    <select value={s} onChange={e => updateStatus(r.id, e.target.value as Status)}
                      style={{ border:'none', outline:'none', borderRadius:20, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer',
                               background: STATUS[s].bg, color: STATUS[s].color, fontFamily:F, appearance:'none' as const }}>
                      {(['미검토','적합','부적합','재요청'] as Status[]).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div style={{ alignSelf:'center' }}>
                    {hasLog
                      ? <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, background:'#D4F5DF', color:'#1A8C3A' }}>{log.length}개</span>
                      : <span style={{ fontSize:11, color:'#C7C7CC' }}>없음</span>}
                  </div>

                  <div style={{ alignSelf:'center' }}>
                    {hasVideo
                      ? <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, background:'#E3F2FF', color:'#0071E3' }}>
                          {videoEntries.length > 1 ? `${videoEntries.length}개` : '있음'}
                        </span>
                      : <span style={{ fontSize:11, color:'#C7C7CC' }}>없음</span>}
                  </div>

                  <span style={{ fontSize:11, color:'#C7C7CC', alignSelf:'center' }}>{r.deviceType ?? '-'}</span>

                  <span style={{ alignSelf:'center', color:'#C7C7CC', fontSize:14, textAlign:'center',
                                 transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s', display:'block' }}>
                    ›
                  </span>
                </div>

                {/* 아코디언 상세 */}
                {isOpen && (
                  <div style={{ padding:'0 20px 24px', background:'#F7F7F9', borderTop:'1px solid #EBEBEB' }}>
                    <div style={{ padding:'20px', background:'#fff', borderRadius:16, border:'1px solid rgba(0,0,0,0.05)', marginTop:16 }}>

                      {/* 기본 정보 그리드 */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'16px 24px', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #F2F2F7' }}>
                        {[['신청일',fmt(r)],['환우명',r.patientName],['보호자',r.caregiverName],
                          ['연락처',r.caregiverContact],['지역',(r.subRegion?`${r.region} ${r.subRegion}`:r.region)],
                          ['소통방법',r.communicationMethod||'-'],['기기',r.deviceType??'-'],
                          ...(r.dotDashBoundary != null ? [['경계값',`${r.dotDashBoundary.toFixed(3)}s`]] : []),
                        ].map(([l,v]) => (
                          <div key={l}>
                            <p style={{ fontSize:11, color:'#8E8E93', marginBottom:3, fontWeight:500 }}>{l}</p>
                            <p style={{ fontSize:14, color:'#000', fontWeight:500 }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* 상태 변경 */}
                      <div style={{ marginBottom:24 }}>
                        <p style={{ fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:10, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>상태 변경</p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {(['적합','부적합','재요청','미검토'] as Status[]).map(v => (
                            <button key={v} onClick={() => updateStatus(r.id, v)}
                              style={{ padding:'7px 18px', borderRadius:980, border:`1.5px solid ${s===v ? STATUS[v].color : '#E5E5EA'}`,
                                       background: s===v ? STATUS[v].bg : '#fff',
                                       color: s===v ? STATUS[v].color : '#8E8E93',
                                       fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, transition:'all 0.15s' }}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 깜빡임 로그 */}
                      <div style={{ marginBottom:24 }}>
                        <p style={{ fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:12, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>깜빡임 로그</p>

                        {log.length === 0 ? (
                          <p style={{ fontSize:13, color:'#C7C7CC', padding:'12px 0' }}>로그 없음 — 최신 앱 빌드로 재검사 필요</p>
                        ) : (
                          <>
                            {/* 요약 칩 */}
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                              {shortAvg && (
                                <div style={{ padding:'6px 12px', borderRadius:10, background:'#F2F2F7', fontSize:12 }}>
                                  <span style={{ color:'#8E8E93' }}>짧게 평균 </span>
                                  <strong style={{ color:'#000' }}>{shortAvg}s</strong>
                                  <span style={{ color:'#C7C7CC', fontSize:10 }}> ({shortAttempts.filter(a=>a.success).length}/{shortAttempts.length})</span>
                                </div>
                              )}
                              {longAvg && (
                                <div style={{ padding:'6px 12px', borderRadius:10, background:'#F2F2F7', fontSize:12 }}>
                                  <span style={{ color:'#8E8E93' }}>길게 평균 </span>
                                  <strong style={{ color:'#000' }}>{longAvg}s</strong>
                                  <span style={{ color:'#C7C7CC', fontSize:10 }}> ({longAttempts.filter(a=>a.success).length}/{longAttempts.length})</span>
                                </div>
                              )}
                              {skipped.length > 0 && (
                                <div style={{ padding:'6px 12px', borderRadius:10, background:'#FFF0D4', fontSize:12, color:'#CC7000' }}>
                                  건너뜀: {skipped.map(s => STEP[s]??s).join(', ')}
                                </div>
                              )}
                            </div>

                            {/* 로그 테이블 */}
                            <div style={{ overflowX:'auto', borderRadius:12, border:'1px solid #F2F2F7' }}>
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                <thead>
                                  <tr style={{ background:'#FAFAFA' }}>
                                    {['#','단계','시도','지속시간','패턴','기대','결과'].map(h => (
                                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#8E8E93', fontWeight:500, borderBottom:'1px solid #F2F2F7', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.map((a, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx<log.length-1?'1px solid #F7F7F9':'none',
                                                           background: a.success?'rgba(52,199,89,0.03)':'rgba(255,59,48,0.03)' }}>
                                      <td style={{ padding:'7px 12px', color:'#C7C7CC' }}>{idx+1}</td>
                                      <td style={{ padding:'7px 12px', fontWeight:500 }}>{STEP[a.step]??a.step}</td>
                                      <td style={{ padding:'7px 12px', color:'#8E8E93' }}>{a.attempt}</td>
                                      <td style={{ padding:'7px 12px', fontVariantNumeric:'tabular-nums' as const }}>
                                        {typeof a.duration==='number'?a.duration.toFixed(3):'-'}s
                                      </td>
                                      <td style={{ padding:'7px 12px', color:'#8E8E93' }}>{a.patternIndex!=null?a.patternIndex+1:'-'}</td>
                                      <td style={{ padding:'7px 12px', color:'#8E8E93' }}>{a.expected?(STEP[a.expected]??a.expected):'-'}</td>
                                      <td style={{ padding:'7px 12px' }}>
                                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                                                       background:a.success?'#D4F5DF':'#FFE0DE', color:a.success?'#1A8C3A':'#CC2200' }}>
                                          {a.success?'성공':'실패'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 영상 */}
                      {videoEntries.length > 0 && (
                        <div style={{ marginBottom:24 }}>
                          <p style={{ fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:12, textTransform:'uppercase' as const, letterSpacing:'0.04em' }}>녹화 영상</p>
                          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                            {videoEntries.map(([seg, url]) => (
                              <div key={seg}>
                                <p style={{ fontSize:11, fontWeight:600, color:'#8E8E93', marginBottom:6 }}>{STEP[seg]??seg}</p>
                                <div style={{ width:135, height:240, overflow:'hidden', borderRadius:12, background:'#000', position:'relative' }}>
                                  <video src={url} controls
                                    style={{ position:'absolute', width:240, height:135, left:-52, top:52,
                                             transform:'rotate(90deg)', transformOrigin:'center center' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 원본 JSON (접힘) */}
                      <details style={{ marginBottom:20 }}>
                        <summary style={{ fontSize:11, color:'#C7C7CC', cursor:'pointer', userSelect:'none' }}>원본 데이터 보기</summary>
                        <pre style={{ marginTop:8, padding:12, background:'#FAFAFA', borderRadius:10, fontSize:10, overflow:'auto', color:'#555', maxHeight:240, lineHeight:1.5 }}>
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      </details>

                      {/* 삭제 */}
                      <button onClick={() => deleteResult(r.id)}
                        style={{ padding:'7px 16px', borderRadius:10, border:'1.5px solid rgba(255,59,48,0.25)', background:'transparent', color:'#FF3B30', fontSize:13, cursor:'pointer', fontFamily:F }}>
                        이 기록 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
