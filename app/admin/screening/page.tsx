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
  deviceType: string | null;
  status?: Status;
  createdAt: { seconds: number } | null;
  blinkLog?: BlinkAttempt[] | null;
  skippedSteps?: string[] | null;
}

const ADMIN_PW = 'Hgo3575425*';
const font = "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  '미검토': { bg: '#F0F0F0', color: '#888' },
  '적합':   { bg: '#D4F5DF', color: '#1A8C3A' },
  '부적합': { bg: '#FFE0DE', color: '#CC2200' },
  '재요청': { bg: '#FFF0D4', color: '#CC7000' },
};

function StatusBadge({ status }: { status?: Status }) {
  const s = status ?? '미검토';
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].color, whiteSpace: 'nowrap' as const }}>
      {s}
    </span>
  );
}

export default function AdminScreeningPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Result | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const login = async () => {
    if (password !== ADMIN_PW) { setError('비밀번호가 틀렸습니다.'); return; }
    setLoading(true); setError('');
    try {
      const q = query(collection(db, 'screening_results'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
      setAuthed(true);
    } catch {
      setError('Firestore 연결 오류. Firebase 콘솔에서 Firestore를 활성화해주세요.');
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'screening_results'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
    } finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: Status) => {
    await updateDoc(doc(db, 'screening_results', id), { status });
    setResults(r => r.map(x => x.id === id ? { ...x, status } : x));
    setSelected(s => s?.id === id ? { ...s, status } : s);
  };

  const deleteResult = async (id: string) => {
    await deleteDoc(doc(db, 'screening_results', id));
    setResults(r => r.filter(x => x.id !== id));
    setSelected(null);
    setConfirmDelete(false);
  };

  const filtered = results.filter(r =>
    !search || r.patientName?.includes(search) || r.caregiverName?.includes(search) || r.caregiverContact?.includes(search)
  );

  const exportCSV = () => {
    const headers = ['날짜', '상태', '환우명', '보호자명', '연락처', '지역', '세부지역', '소통방법', '영상URL', '기기'];
    const rows = results.map(r => [
      r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString('ko-KR') : '-',
      r.status ?? '미검토',
      r.patientName, r.caregiverName, r.caregiverContact,
      r.region, r.subRegion ?? '', r.communicationMethod ?? '',
      r.videoUrl ?? '', r.deviceType ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'morspeak_screening.csv'; a.click();
  };

  const fmtDate = (r: Result) =>
    r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '-';

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 360, width: '100%', margin: '0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', marginBottom: 6 }}>관리자</h1>
        <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', marginBottom: 28 }}>모스픽 내부 관계자만 접근 가능합니다.</p>
        <input type="password" placeholder="비밀번호" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '14px 16px', border: '1.5px solid rgba(60,60,67,0.18)', borderRadius: 980, fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: font, marginBottom: 12 }} />
        {error && <p style={{ color: '#FF3B30', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button onClick={login} disabled={loading}
          style={{ width: '100%', padding: '15px', borderRadius: 980, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font }}>
      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(60,60,67,0.12)', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 2 }}>모스픽 사용 적합성 검사 결과</h1>
            <p style={{ fontSize: 13, color: 'rgba(60,60,67,0.6)' }}>
              총 {results.length}명 &nbsp;·&nbsp;
              적합 {results.filter(r => r.status === '적합').length} &nbsp;·&nbsp;
              부적합 {results.filter(r => r.status === '부적합').length} &nbsp;·&nbsp;
              재요청 {results.filter(r => r.status === '재요청').length} &nbsp;·&nbsp;
              미검토 {results.filter(r => !r.status || r.status === '미검토').length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="이름, 연락처 검색" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid rgba(60,60,67,0.18)', borderRadius: 980, fontSize: 14, outline: 'none', fontFamily: font, width: 180 }} />
            <button onClick={refresh} disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 980, border: '1.5px solid rgba(60,60,67,0.18)', background: '#fff', color: 'rgba(60,60,67,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: font }}>
              {loading ? '...' : '새로고침'}
            </button>
            <button onClick={exportCSV}
              style={{ padding: '8px 16px', borderRadius: 980, border: '1.5px solid rgba(60,60,67,0.18)', background: '#fff', color: 'rgba(60,60,67,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: font }}>
              CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        {/* 목록 */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(60,60,67,0.12)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid rgba(60,60,67,0.1)' }}>
                {['날짜', '상태', '환우명', '보호자명', '연락처', '지역', '소통방법', '영상', '기기', '로그', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(60,60,67,0.5)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(60,60,67,0.07)' : 'none', cursor: 'pointer', background: selected?.id === r.id ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = selected?.id === r.id ? 'rgba(0,0,0,0.02)' : 'transparent')}
                >
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.5)', whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(r)}</td>
                  <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                    <select
                      value={r.status ?? '미검토'}
                      onChange={e => updateStatus(r.id, e.target.value as Status)}
                      style={{ border: 'none', outline: 'none', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: STATUS_STYLE[r.status ?? '미검토'].bg, color: STATUS_STYLE[r.status ?? '미검토'].color, fontFamily: font, appearance: 'none' as const }}
                    >
                      {(['미검토', '적합', '부적합', '재요청'] as Status[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#000' }}>{r.patientName}</td>
                  <td style={{ padding: '14px 16px' }}>{r.caregiverName}</td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>{r.caregiverContact}</td>
                  <td style={{ padding: '14px 16px' }}>{r.subRegion ? `${r.region} ${r.subRegion}` : r.region}</td>
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.6)' }}>{r.communicationMethod || '-'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {r.videoUrl
                      ? <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ color: '#1C1C1E', fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>보기 ↗</a>
                      : <span style={{ color: '#ccc', fontSize: 13 }}>없음</span>}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.4)', fontSize: 13 }}>{r.deviceType ?? '-'}</td>
                  {/* 로그 유무 */}
                  <td style={{ padding: '14px 16px' }}>
                    {r.blinkLog && r.blinkLog.length > 0
                      ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#D4F5DF', color: '#1A8C3A' }}>{r.blinkLog.length}개</span>
                      : <span style={{ fontSize: 11, color: '#ccc' }}>없음</span>}
                  </td>
                  {/* 행 삭제 */}
                  <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm(`${r.patientName} 기록을 삭제하시겠습니까?`)) deleteResult(r.id); }}
                      style={{ background: 'none', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 6, color: '#FF3B30', fontSize: 12, cursor: 'pointer', padding: '3px 8px' }}
                    >삭제</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ padding: '60px', textAlign: 'center', color: 'rgba(60,60,67,0.4)' }}>결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(60,60,67,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>{selected.patientName}</h2>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'rgba(60,60,67,0.4)' }}>×</button>
            </div>

            {/* 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                ['신청일', fmtDate(selected)],
                ['환우명', selected.patientName],
                ['보호자명', selected.caregiverName],
                ['연락처', selected.caregiverContact],
                ['지역', selected.subRegion ? `${selected.region} ${selected.subRegion}` : selected.region],
                ['소통방법', selected.communicationMethod || '-'],
                ['기기', selected.deviceType ?? '-'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 15, color: '#000', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* blinkLog — 항상 표시 (영상 위에) */}
            {(() => {
              const log = selected.blinkLog ?? [];
              const skipped = selected.skippedSteps ?? [];
              const STEP_LABEL: Record<string, string> = { short: '짧게', long: '길게', mixed: '혼합' };
              const shortAttempts = log.filter(a => a.step === 'short');
              const longAttempts  = log.filter(a => a.step === 'long');
              const shortSuccessAvg = shortAttempts.filter(a => a.success).length > 0
                ? (shortAttempts.filter(a => a.success).reduce((s, a) => s + a.duration, 0) / shortAttempts.filter(a => a.success).length).toFixed(3)
                : null;
              const longSuccessAvg = longAttempts.filter(a => a.success).length > 0
                ? (longAttempts.filter(a => a.success).reduce((s, a) => s + a.duration, 0) / longAttempts.filter(a => a.success).length).toFixed(3)
                : null;
              return (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 8 }}>깜빡임 로그</p>

                  {log.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'rgba(60,60,67,0.35)', padding: '12px 0' }}>
                      로그 없음 (앱 최신 버전으로 재검사 필요)
                    </p>
                  ) : (
                    <>
                      {/* 요약 */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        {shortSuccessAvg && (
                          <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
                            <span style={{ color: 'rgba(60,60,67,0.5)' }}>짧게 평균 </span>
                            <strong style={{ color: '#1C1C1E' }}>{shortSuccessAvg}s</strong>
                            <span style={{ color: 'rgba(60,60,67,0.4)', fontSize: 11 }}> ({shortAttempts.filter(a => a.success).length}/{shortAttempts.length})</span>
                          </div>
                        )}
                        {longSuccessAvg && (
                          <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
                            <span style={{ color: 'rgba(60,60,67,0.5)' }}>길게 평균 </span>
                            <strong style={{ color: '#1C1C1E' }}>{longSuccessAvg}s</strong>
                            <span style={{ color: 'rgba(60,60,67,0.4)', fontSize: 11 }}> ({longAttempts.filter(a => a.success).length}/{longAttempts.length})</span>
                          </div>
                        )}
                        {skipped.length > 0 && (
                          <div style={{ background: '#FFF0D4', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
                            <span style={{ color: '#CC7000' }}>스킵: {skipped.map(s => STEP_LABEL[s] ?? s).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* 테이블 */}
                      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(60,60,67,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#F9F9F9', borderBottom: '1px solid rgba(60,60,67,0.1)' }}>
                              {['#', '단계', '시도', '지속시간', '패턴위치', '기대값', '결과'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(60,60,67,0.5)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {log.map((a, i) => (
                              <tr key={i} style={{ borderBottom: i < log.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none', background: a.success ? 'rgba(52,199,89,0.04)' : 'rgba(255,59,48,0.04)' }}>
                                <td style={{ padding: '7px 12px', color: 'rgba(60,60,67,0.4)' }}>{i + 1}</td>
                                <td style={{ padding: '7px 12px', fontWeight: 500, color: '#1C1C1E' }}>{STEP_LABEL[a.step] ?? a.step}</td>
                                <td style={{ padding: '7px 12px', color: 'rgba(60,60,67,0.6)' }}>{a.attempt}</td>
                                <td style={{ padding: '7px 12px', color: '#1C1C1E', fontVariantNumeric: 'tabular-nums' }}>{typeof a.duration === 'number' ? a.duration.toFixed(3) : '-'}s</td>
                                <td style={{ padding: '7px 12px', color: 'rgba(60,60,67,0.5)' }}>{a.patternIndex != null ? a.patternIndex + 1 : '-'}</td>
                                <td style={{ padding: '7px 12px', color: 'rgba(60,60,67,0.5)' }}>{a.expected ? (STEP_LABEL[a.expected] ?? a.expected) : '-'}</td>
                                <td style={{ padding: '7px 12px' }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: a.success ? '#D4F5DF' : '#FFE0DE', color: a.success ? '#1A8C3A' : '#CC2200' }}>
                                    {a.success ? '성공' : '실패'}
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
              );
            })()}

            {/* 영상 (blinkLog 아래) */}
            {selected.videoUrl && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 8 }}>녹화 영상</p>
                {/* ARKit 세로 영상: 시계방향 90도 회전 보정 */}
                <div style={{ width: 270, height: 480, overflow: 'hidden', borderRadius: 12, background: '#000', position: 'relative' }}>
                  <video src={selected.videoUrl} controls
                    style={{
                      position: 'absolute',
                      width: 480,
                      height: 270,
                      left: -105,
                      top: 105,
                      transform: 'rotate(90deg)',
                      transformOrigin: 'center center',
                    }} />
                </div>
              </div>
            )}

            {/* 상태 변경 */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 10 }}>상태 변경</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['적합', '부적합', '재요청', '미검토'] as Status[]).map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    style={{
                      padding: '8px 18px', borderRadius: 980, border: '1.5px solid',
                      borderColor: selected.status === s ? STATUS_STYLE[s].color : 'rgba(60,60,67,0.18)',
                      background: selected.status === s ? STATUS_STYLE[s].bg : '#fff',
                      color: selected.status === s ? STATUS_STYLE[s].color : 'rgba(60,60,67,0.5)',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* raw 데이터 (디버그) */}
            <details style={{ marginBottom: 20 }}>
              <summary style={{ fontSize: 12, color: 'rgba(60,60,67,0.4)', cursor: 'pointer', userSelect: 'none' }}>
                원본 데이터 보기
              </summary>
              <pre style={{ marginTop: 8, padding: 12, background: '#F9F9F9', borderRadius: 10, fontSize: 11, overflow: 'auto', color: '#333', maxHeight: 300 }}>
                {JSON.stringify(selected, null, 2)}
              </pre>
            </details>

            {/* 삭제 */}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                style={{ padding: '8px 18px', borderRadius: 980, border: '1.5px solid rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.05)', color: '#FF3B30', fontSize: 14, cursor: 'pointer', fontFamily: font }}>
                삭제
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 14, color: '#FF3B30' }}>정말 삭제하시겠습니까?</p>
                <button onClick={() => deleteResult(selected.id)}
                  style={{ padding: '8px 18px', borderRadius: 980, border: 'none', background: '#FF3B30', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                  삭제
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ padding: '8px 18px', borderRadius: 980, border: '1.5px solid rgba(60,60,67,0.18)', background: '#fff', color: 'rgba(60,60,67,0.6)', fontSize: 14, cursor: 'pointer', fontFamily: font }}>
                  취소
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
