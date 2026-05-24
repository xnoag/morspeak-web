'use client';

import { useState } from 'react';
import { collection, getDocs, orderBy, query, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
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
  consentPrivacy?: boolean;
  consentCamera?: boolean;
  consentContact?: boolean;
  deviceType: string | null;
  status?: Status;
  createdAt: { seconds: number } | null;
  blinkLog?: BlinkAttempt[] | null;
  skippedSteps?: string[] | null;
  dotDashBoundary?: number;
}

const ADMIN_PW = 'Hgo3575425*';
const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";
const STATUS: Record<Status, { bg: string; color: string }> = {
  '미검토': { bg: '#F2F2F7', color: '#8E8E93' },
  '적합':   { bg: '#D4F5DF', color: '#1A8C3A' },
  '부적합': { bg: '#FFE0DE', color: '#CC2200' },
  '재요청': { bg: '#FFF0D4', color: '#CC7000' },
};
const STEP: Record<string, string> = { short: '짧게', long: '길게', mixed: '혼합' };

function avg(blinks: BlinkAttempt[], step: string) {
  const ok = blinks.filter(a => a.step === step && a.success);
  if (!ok.length) return null;
  return (ok.reduce((s, a) => s + a.duration, 0) / ok.length).toFixed(2);
}

// ── 도입 적합도 분석 ─────────────────────────────────────────
interface Suitability {
  score: number;       // 0–100
  label: string;
  color: string;
  bg: string;
  reason: string;      // 한 줄 근거
}

function calcSuitability(r: Result): Suitability | null {
  const log = r.blinkLog ?? [];
  if (log.length === 0) return null;

  const sLog = log.filter(a => a.step === 'short');
  const lLog = log.filter(a => a.step === 'long');
  const mLog = log.filter(a => a.step === 'mixed');
  const skipped = r.skippedSteps ?? [];

  const sRate = sLog.length > 0 ? sLog.filter(a => a.success).length / sLog.length : 0;
  const lRate = lLog.length > 0 ? lLog.filter(a => a.success).length / lLog.length : 0;
  const mRate = mLog.length > 0 ? mLog.filter(a => a.success).length / mLog.length : 0;

  const sAvg = sLog.filter(a => a.success).reduce((s,a)=>s+a.duration,0) / (sLog.filter(a=>a.success).length||1);
  const lAvg = lLog.filter(a => a.success).reduce((s,a)=>s+a.duration,0) / (lLog.filter(a=>a.success).length||1);
  const gap  = lLog.filter(a=>a.success).length > 0 && sLog.filter(a=>a.success).length > 0 ? lAvg - sAvg : 0;

  let score = 0;

  // 짧게 성공률 (0–25)
  score += sRate * 25;
  // 길게 성공률 (0–25)
  score += lRate * 25;
  // 혼합 성공률 (0–20)
  score += mRate * 20;
  // 짧게·길게 간격 명확성 (0–20): 간격이 클수록 좋음
  if (gap > 0.45) score += 20;
  else if (gap > 0.30) score += 15;
  else if (gap > 0.15) score += 8;
  else score += 2;
  // 경계값 합리성 (0–10): 0.2s~1.0s 범위
  const b = r.dotDashBoundary ?? 0;
  if (b > 0.2 && b < 1.0) score += 10;
  else if (b > 0) score += 4;

  // 패널티: 단계 건너뜀 (-8/개)
  score -= skipped.length * 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // 주요 근거 한 줄
  const reasons: string[] = [];
  if (sRate >= 0.8) reasons.push(`짧게 ${Math.round(sRate*100)}%`);
  else reasons.push(`짧게 ${Math.round(sRate*100)}% (낮음)`);
  if (gap > 0.2) reasons.push(`간격 ${gap.toFixed(2)}s`);
  else reasons.push('간격 좁음');
  if (skipped.length) reasons.push(`${skipped.map(s=>STEP[s]??s).join('·')} 건너뜀`);

  let label: string, color: string, bg: string;
  if      (score >= 80) { label='도입 추천';    color='#1A8C3A'; bg='#D4F5DF'; }
  else if (score >= 60) { label='가능성 있음';  color='#0071E3'; bg='#E3F2FF'; }
  else if (score >= 40) { label='훈련 필요';    color='#CC7000'; bg='#FFF0D4'; }
  else                  { label='어려울 수 있음'; color='#CC2200'; bg='#FFE0DE'; }

  return { score, label, color, bg, reason: reasons.join(' · ') };
}

export default function AdminScreeningPage() {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Status | '전체'>('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ensureAuth = async () => {
    const auth = getAuth();
    if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
  };

  const load = async () => {
    setLoading(true);
    await ensureAuth();
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

  // Download URL → Storage 경로 추출 (gs:// 또는 https://firebasestorage... 모두 처리)
  const urlToStoragePath = (url: string): string | null => {
    try {
      if (url.startsWith('gs://')) {
        return url.replace(/^gs:\/\/[^/]+\//, '');
      }
      // https://firebasestorage.googleapis.com/v0/b/xxx/o/path%2Ffile.mp4?alt=media&token=...
      const u = new URL(url);
      const match = u.pathname.match(/\/o\/(.+)/);
      if (!match) return null;
      return decodeURIComponent(match[1]);
    } catch { return null; }
  };

  // Storage 영상 파일 삭제 — 경로 직접 추출 후 deleteObject
  const deleteStorageFiles = async (r: Result) => {
    await ensureAuth();  // Storage 삭제에도 인증 필요
    const storage = getStorage();
    const urls = [
      r.videoUrl,
      ...(r.videoUrls ? Object.values(r.videoUrls) : []),
    ].filter(Boolean) as string[];

    const results = await Promise.allSettled(
      urls.map(async url => {
        const path = urlToStoragePath(url);
        if (!path) { console.warn('경로 추출 실패:', url); return; }
        try {
          await deleteObject(ref(storage, path));
          console.log('✅ Storage 삭제:', path);
        } catch (e: unknown) {
          // 이미 삭제됐거나 없는 파일은 무시
          const code = (e as { code?: string })?.code;
          if (code !== 'storage/object-not-found') {
            console.warn('⚠️ Storage 삭제 실패:', path, e);
          }
        }
      })
    );
    console.log(`Storage 삭제 완료: ${results.filter(r => r.status === 'fulfilled').length}/${results.length}`);
  };

  const updateStatus = async (id: string, status: Status) => {
    await updateDoc(doc(db, 'screening_results', id), { status });
    setResults(r => r.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteOne = async (id: string) => {
    try {
      // 1. Firestore 먼저 삭제 (핵심)
      await deleteDoc(doc(db, 'screening_results', id));
      // 2. UI 즉시 업데이트
      setResults(prev => prev.filter(x => x.id !== id));
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      if (expandedId === id) setExpandedId(null);
      // 3. Storage 파일 삭제 (await으로 완료 확인)
      const r = results.find(x => x.id === id);
      if (r) await deleteStorageFiles(r);
    } catch (e) {
      alert('삭제 실패: ' + (e as Error).message);
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`선택한 ${selected.size}건을 삭제하시겠습니까?\n영상 파일도 함께 삭제됩니다.`)) return;
    const toDelete = results.filter(x => selected.has(x.id));
    try {
      // 1. Firestore 먼저 일괄 삭제
      await Promise.all([...selected].map(id => deleteDoc(doc(db, 'screening_results', id))));
      // 2. UI 즉시 업데이트
      const deletedIds = new Set(selected);
      setResults(prev => prev.filter(x => !deletedIds.has(x.id)));
      setSelected(new Set());
      if (deletedIds.has(expandedId ?? '')) setExpandedId(null);
      // 3. Storage 파일 삭제 (완료 확인)
      await Promise.all(toDelete.map(r => deleteStorageFiles(r)));
    } catch (e) {
      alert('일부 삭제 실패: ' + (e as Error).message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = (ids: string[]) => {
    const allIn = ids.every(id => selected.has(id));
    setSelected(s => { const n = new Set(s); allIn ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; });
  };

  const exportCSV = () => {
    const h = ['날짜','상태','환우명','보호자','연락처','지역','소통방법','기기','짧게avg','길게avg','로그수','영상','경계값'];
    const rows = results.map(r => {
      const log = r.blinkLog ?? [];
      return [
        r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleString('ko-KR') : '-',
        r.status ?? '미검토', r.patientName, r.caregiverName, r.caregiverContact,
        r.subRegion ? `${r.region} ${r.subRegion}` : r.region,
        r.communicationMethod ?? '', r.deviceType ?? '',
        avg(log,'short') ?? '-', avg(log,'long') ?? '-',
        log.length, r.videoUrl ? '있음' : '없음',
        r.dotDashBoundary?.toFixed(3) ?? '-',
      ];
    });
    const csv = [h, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'morspeak_screening.csv'; a.click();
  };

  const fmt = (r: Result) => {
    if (!r.createdAt) return '-';
    const d = new Date(r.createdAt.seconds * 1000);
    const date = d.toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit' });
    const time = d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12: false });
    return `${date} ${time}`;
  };

  const filtered = results.filter(r => {
    const s = r.status ?? '미검토';
    if (categoryFilter !== '전체' && s !== categoryFilter) return false;
    if (search && !r.patientName?.includes(search) && !r.caregiverName?.includes(search) && !r.caregiverContact?.includes(search)) return false;
    return true;
  });

  const filteredIds = filtered.map(r => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));

  const counts: Record<string, number> = {
    '전체': results.length,
    '미검토': results.filter(r => (r.status ?? '미검토') === '미검토').length,
    '적합': results.filter(r => r.status === '적합').length,
    '부적합': results.filter(r => r.status === '부적합').length,
    '재요청': results.filter(r => r.status === '재요청').length,
  };

  // ── 로그인 ────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'#F7F7F9', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'48px 40px', maxWidth:380, width:'100%', margin:'0 20px', boxShadow:'0 4px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ width:44,height:44,borderRadius:12,background:'#1C1C1E',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2a5 5 0 0 1 5 5v1h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0-7a3 3 0 0 0-3 3v1h6V7a3 3 0 0 0-3-3z" fill="#fff"/></svg>
        </div>
        <h1 style={{ fontSize:24,fontWeight:700,color:'#000',marginBottom:4 }}>모스픽 어드민</h1>
        <p style={{ fontSize:14,color:'#8E8E93',marginBottom:28 }}>내부 관계자만 접근 가능합니다</p>
        <input type="password" placeholder="비밀번호" value={pw}
          onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          style={{ width:'100%',padding:'14px 16px',border:'1.5px solid #E5E5EA',borderRadius:14,fontSize:16,outline:'none',boxSizing:'border-box',fontFamily:F,marginBottom:10 }} />
        {error && <p style={{ color:'#FF3B30',fontSize:13,marginBottom:8 }}>{error}</p>}
        <button onClick={login} disabled={loading}
          style={{ width:'100%',padding:'15px',borderRadius:14,border:'none',background:'#1C1C1E',color:'#fff',fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:F }}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </div>
    </div>
  );

  // ── 메인 ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#F7F7F9', fontFamily:F, display:'flex', flexDirection:'column' }}>

      {/* 헤더 */}
      <div style={{ background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'14px 24px',position:'sticky',top:0,zIndex:50 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
          <div style={{ display:'flex',alignItems:'center',gap:16 }}>
            <span style={{ fontSize:17,fontWeight:700,color:'#000' }}>모스픽 적합성 검사</span>
            {/* 카테고리 탭 */}
            <div style={{ display:'flex',gap:4,background:'#F2F2F7',borderRadius:10,padding:3 }}>
              {(['전체','미검토','적합','부적합','재요청'] as const).map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding:'5px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:F,
                    fontSize:12,fontWeight:categoryFilter===cat?600:400,
                    background:categoryFilter===cat?'#fff':'transparent',
                    color:categoryFilter===cat?'#000':'#8E8E93',
                    boxShadow:categoryFilter===cat?'0 1px 4px rgba(0,0,0,0.1)':'none',
                    transition:'all 0.15s',
                  }}>
                  {cat} <span style={{ color:categoryFilter===cat?'#8E8E93':'#C7C7CC',fontWeight:400 }}>{counts[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {selected.size > 0 && (
              <button onClick={deleteSelected}
                style={{ padding:'7px 14px',borderRadius:10,border:'none',background:'#FF3B30',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                선택 삭제 ({selected.size})
              </button>
            )}
            <input placeholder="이름·연락처 검색" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ padding:'7px 12px',border:'1.5px solid #E5E5EA',borderRadius:10,fontSize:13,outline:'none',fontFamily:F,width:150 }} />
            <button onClick={load} disabled={loading}
              style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
              {loading?'…':'↻'}
            </button>
            <button onClick={exportCSV}
              style={{ padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E5EA',background:'#fff',color:'#3C3C43',fontSize:13,cursor:'pointer',fontFamily:F }}>
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ flex:1,padding:'16px 24px' }}>
        <div style={{ background:'#fff',borderRadius:16,border:'1px solid rgba(0,0,0,0.06)',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1.5px solid #F2F2F7',background:'#FAFAFA' }}>
                {/* 전체선택 체크박스 */}
                <th style={{ width:40,padding:'10px 12px',textAlign:'center' }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={() => toggleAll(filteredIds)}
                    style={{ cursor:'pointer',width:14,height:14 }} />
                </th>
                {[
                  {h:'날짜·시간',tip:''},
                  {h:'환우명',tip:''},{h:'보호자',tip:''},{h:'연락처',tip:''},
                  {h:'지역',tip:''},{h:'소통방법',tip:''},{h:'상태',tip:''},
                  {h:'적합도 ⓘ',tip:'깜빡임 성공률·간격·혼합 패턴 종합 도입 가능성 점수 (0~100)'},
                  {h:'짧게avg',tip:'짧게 깜빡임 평균 지속시간 (성공만)'},{h:'길게avg',tip:'길게 깜빡임 평균 지속시간 (성공만)'},
                  {h:'경계값 ⓘ',tip:'짧게/길게 구분 임계시간 — Morspeak 앱에 직접 사용되는 개인별 캘리브레이션 값'},
                  {h:'로그',tip:''},{h:'건너뜀',tip:''},{h:'영상',tip:''},{h:'기기',tip:''},{h:'연락동의',tip:'서비스 연락 수신 선택 동의 여부'},{h:'',tip:''},
                ].map(({h,tip}) => (
                  <th key={h} title={tip||undefined} style={{ padding:'10px 12px',textAlign:'left',color:'#8E8E93',fontWeight:500,whiteSpace:'nowrap',fontSize:11,letterSpacing:'0.03em',cursor:tip?'help':'default' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={18} style={{ padding:'60px',textAlign:'center',color:'#C7C7CC' }}>결과가 없습니다</td></tr>
              )}
              {filtered.map((r, i) => {
                const isOpen = expandedId === r.id;
                const isChecked = selected.has(r.id);
                const s = r.status ?? '미검토';
                const log = r.blinkLog ?? [];
                const skipped = r.skippedSteps ?? [];
                const shortAvg = avg(log,'short');
                const longAvg  = avg(log,'long');
                const hasVideo = !!(r.videoUrl || r.videoUrls);
                const suit = calcSuitability(r);
                const videoEntries: [string,string][] = r.videoUrls
                  ? (['short','long','mixed'] as const).filter(k=>r.videoUrls?.[k]).map(k=>[k,r.videoUrls![k]!])
                  : r.videoUrl ? [['recording',r.videoUrl]] : [];

                return [
                  /* 데이터 행 */
                  <tr key={r.id}
                    style={{ borderTop:i>0?'1px solid #F7F7F9':'none', background:isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent', cursor:'pointer' }}
                    onMouseEnter={e => { if(!isOpen&&!isChecked) e.currentTarget.style.background='#FAFAFA'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isOpen?'#F7F7F9':isChecked?'rgba(0,122,255,0.04)':'transparent'; }}
                  >
                    <td style={{ padding:'12px',textAlign:'center' }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(r.id)} style={{ cursor:'pointer',width:14,height:14 }} />
                    </td>
                    <td style={{ padding:'12px',color:'#8E8E93',whiteSpace:'nowrap' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{fmt(r)}</td>
                    <td style={{ padding:'12px',fontWeight:600,color:'#000' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.patientName}</td>
                    <td style={{ padding:'12px',color:'#3C3C43' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.caregiverName}</td>
                    <td style={{ padding:'12px',color:'#3C3C43',whiteSpace:'nowrap' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.caregiverContact}</td>
                    <td style={{ padding:'12px',color:'#3C3C43' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.subRegion?`${r.region} ${r.subRegion}`:r.region}</td>
                    <td style={{ padding:'12px',color:'#3C3C43' }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.communicationMethod||'-'}</td>
                    {/* 상태 드롭다운 */}
                    <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                      <select value={s} onChange={e=>updateStatus(r.id,e.target.value as Status)}
                        style={{ border:'none',outline:'none',borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',background:STATUS[s].bg,color:STATUS[s].color,fontFamily:F,appearance:'none' as const }}>
                        {(['미검토','적합','부적합','재요청'] as Status[]).map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    {/* 적합도 */}
                    <td style={{ padding:'8px 12px' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {suit ? (
                        <div>
                          <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:2 }}>
                            <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:suit.bg,color:suit.color,whiteSpace:'nowrap' as const }}>
                              {suit.label}
                            </span>
                            <span style={{ fontSize:11,fontWeight:600,color:suit.color }}>{suit.score}</span>
                          </div>
                          <p style={{ fontSize:10,color:'#8E8E93',margin:0 }}>{suit.reason}</p>
                        </div>
                      ) : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px',fontVariantNumeric:'tabular-nums' as const,color:shortAvg?'#000':'#C7C7CC' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {shortAvg ? `${shortAvg}s` : '-'}
                    </td>
                    <td style={{ padding:'12px',fontVariantNumeric:'tabular-nums' as const,color:longAvg?'#000':'#C7C7CC' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {longAvg ? `${longAvg}s` : '-'}
                    </td>
                    <td style={{ padding:'12px',fontVariantNumeric:'tabular-nums' as const,color:r.dotDashBoundary!=null?'#000':'#C7C7CC' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {r.dotDashBoundary!=null ? `${r.dotDashBoundary.toFixed(2)}s` : '-'}
                    </td>
                    <td style={{ padding:'12px' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {log.length>0
                        ? <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#D4F5DF',color:'#1A8C3A' }}>{log.length}</span>
                        : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {skipped.length>0
                        ? <span style={{ fontSize:11,color:'#CC7000' }}>{skipped.map(s=>STEP[s]??s).join(' ')}</span>
                        : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {hasVideo
                        ? <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#E3F2FF',color:'#0071E3' }}>
                            {videoEntries.length>1?`${videoEntries.length}개`:'있음'}
                          </span>
                        : <span style={{ color:'#C7C7CC',fontSize:11 }}>-</span>}
                    </td>
                    <td style={{ padding:'12px',color:'#C7C7CC',fontSize:11 }} onClick={() => setExpandedId(isOpen?null:r.id)}>{r.deviceType??'-'}</td>
                    {/* 연락 동의 여부 */}
                    <td style={{ padding:'8px 12px' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      {r.consentContact === undefined
                        ? <span style={{ fontSize:11, color:'#C7C7CC' }}>-</span>
                        : r.consentContact
                          ? <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#D4F5DF', color:'#1A8C3A' }}>동의</span>
                          : <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#F2F2F7', color:'#8E8E93' }}>미동의</span>
                      }
                    </td>
                    <td style={{ padding:'12px',textAlign:'center' }} onClick={() => setExpandedId(isOpen?null:r.id)}>
                      <span style={{ color:'#C7C7CC',fontSize:16,display:'inline-block',transform:isOpen?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s' }}>›</span>
                    </td>
                  </tr>,

                  /* 아코디언 상세 */
                  isOpen && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={18} style={{ padding:'0 16px 20px',background:'#F7F7F9',borderBottom:'2px solid #E5E5EA' }}>
                        <div style={{ background:'#fff',borderRadius:16,border:'1px solid rgba(0,0,0,0.05)',padding:'20px',marginTop:12 }}>

                          {/* 정보 + 상태 */}
                          <div style={{ display:'flex',gap:24,flexWrap:'wrap',marginBottom:20,paddingBottom:16,borderBottom:'1px solid #F2F2F7' }}>
                            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'12px 20px',flex:1 }}>
                              {[['환우명',r.patientName],['보호자',r.caregiverName],['연락처',r.caregiverContact],
                                ['지역',(r.subRegion?`${r.region} ${r.subRegion}`:r.region)],
                                ['소통방법',r.communicationMethod||'-'],['기기',r.deviceType??'-'],['신청일',fmt(r)],
                          ['연락동의', r.consentContact === undefined ? '-' : r.consentContact ? '동의' : '미동의'],
                                ...(r.dotDashBoundary!=null?[['경계값',`${r.dotDashBoundary.toFixed(3)}s`]]:[]),
                              ].map(([l,v])=>(
                                <div key={l}>
                                  <p style={{ fontSize:10,color:'#8E8E93',marginBottom:2,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>{l}</p>
                                  <p style={{ fontSize:13,color:'#000',fontWeight:500 }}>{v}</p>
                                </div>
                              ))}
                            </div>
                            {/* 상태 변경 */}
                            <div style={{ flexShrink:0 }}>
                              <p style={{ fontSize:10,color:'#8E8E93',marginBottom:8,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>상태</p>
                              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                                {(['적합','부적합','재요청','미검토'] as Status[]).map(v=>(
                                  <button key={v} onClick={()=>updateStatus(r.id,v)}
                                    style={{ padding:'6px 14px',borderRadius:20,border:`1.5px solid ${s===v?STATUS[v].color:'#E5E5EA'}`,
                                             background:s===v?STATUS[v].bg:'#fff',color:s===v?STATUS[v].color:'#8E8E93',
                                             fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F }}>
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 깜빡임 로그 */}
                          <div style={{ marginBottom:20 }}>
                            <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>깜빡임 로그</p>
                            {log.length===0 ? (
                              <p style={{ fontSize:13,color:'#C7C7CC' }}>로그 없음 — 최신 앱 빌드로 재검사 필요</p>
                            ) : (
                              <>
                                <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:10 }}>
                                  {shortAvg && <div style={{ padding:'5px 10px',borderRadius:8,background:'#F2F2F7',fontSize:12 }}><span style={{ color:'#8E8E93' }}>짧게 </span><strong>{shortAvg}s</strong><span style={{ color:'#C7C7CC',fontSize:10 }}> ({log.filter(a=>a.step==='short'&&a.success).length}/{log.filter(a=>a.step==='short').length})</span></div>}
                                  {longAvg  && <div style={{ padding:'5px 10px',borderRadius:8,background:'#F2F2F7',fontSize:12 }}><span style={{ color:'#8E8E93' }}>길게 </span><strong>{longAvg}s</strong><span style={{ color:'#C7C7CC',fontSize:10 }}> ({log.filter(a=>a.step==='long'&&a.success).length}/{log.filter(a=>a.step==='long').length})</span></div>}
                                  {skipped.length>0 && <div style={{ padding:'5px 10px',borderRadius:8,background:'#FFF0D4',fontSize:12,color:'#CC7000' }}>건너뜀: {skipped.map(s=>STEP[s]??s).join(', ')}</div>}
                                </div>
                                <div style={{ overflowX:'auto',borderRadius:10,border:'1px solid #F2F2F7' }}>
                                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                                    <thead><tr style={{ background:'#FAFAFA',borderBottom:'1px solid #F2F2F7' }}>
                                      {['#','단계','시도','지속시간','패턴','기대','결과'].map(h=>(
                                        <th key={h} style={{ padding:'7px 10px',textAlign:'left',color:'#8E8E93',fontWeight:500 }}>{h}</th>
                                      ))}
                                    </tr></thead>
                                    <tbody>
                                      {log.map((a,idx)=>(
                                        <tr key={idx} style={{ borderBottom:idx<log.length-1?'1px solid #F7F7F9':'none',
                                                               background:a.success?'rgba(52,199,89,0.03)':'rgba(255,59,48,0.03)' }}>
                                          <td style={{ padding:'6px 10px',color:'#C7C7CC' }}>{idx+1}</td>
                                          <td style={{ padding:'6px 10px',fontWeight:500 }}>{STEP[a.step]??a.step}</td>
                                          <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.attempt}</td>
                                          <td style={{ padding:'6px 10px',fontVariantNumeric:'tabular-nums' as const }}>{typeof a.duration==='number'?a.duration.toFixed(3):'-'}s</td>
                                          <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.patternIndex!=null?a.patternIndex+1:'-'}</td>
                                          <td style={{ padding:'6px 10px',color:'#8E8E93' }}>{a.expected?(STEP[a.expected]??a.expected):'-'}</td>
                                          <td style={{ padding:'6px 10px' }}>
                                            <span style={{ fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:20,
                                                           background:a.success?'#D4F5DF':'#FFE0DE',color:a.success?'#1A8C3A':'#CC2200' }}>
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
                          {videoEntries.length>0 && (
                            <div style={{ marginBottom:20 }}>
                              <p style={{ fontSize:10,fontWeight:600,color:'#8E8E93',marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.04em' }}>녹화 영상</p>
                              <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
                                {videoEntries.map(([seg,url])=>(
                                  <div key={seg}>
                                    <p style={{ fontSize:11,fontWeight:600,color:'#8E8E93',marginBottom:5 }}>{STEP[seg]??seg}</p>
                                    <video src={url} controls
                                      style={{ width:200,borderRadius:10,display:'block',background:'#000' }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 원본 + 삭제 */}
                          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                            <details style={{ flex:1 }}>
                              <summary style={{ fontSize:11,color:'#C7C7CC',cursor:'pointer',userSelect:'none' as const }}>원본 데이터 보기</summary>
                              <pre style={{ marginTop:8,padding:10,background:'#FAFAFA',borderRadius:8,fontSize:10,overflow:'auto',color:'#555',maxHeight:200,lineHeight:1.5 }}>{JSON.stringify(r,null,2)}</pre>
                            </details>
                            <button onClick={() => deleteOne(r.id)}
                              style={{ flexShrink:0,padding:'7px 16px',borderRadius:10,border:'1.5px solid rgba(255,59,48,0.25)',background:'transparent',color:'#FF3B30',fontSize:12,cursor:'pointer',fontFamily:F }}>
                              이 기록 삭제
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
