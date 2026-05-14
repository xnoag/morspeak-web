'use client';

import { useState, useEffect } from 'react';

interface Result {
  id: string;
  created_at: string;
  patient_name: string;
  caregiver_name: string;
  caregiver_contact: string;
  region: string;
  communication_method: string | null;
  note: string | null;
  video_url: string | null;
  blink_detected: boolean | null;
  device_type: string | null;
}

export default function AdminScreeningPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'detected' | 'not_detected'>('all');

  const fetchResults = async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/screening?password=${encodeURIComponent(pw)}`);
      if (!res.ok) throw new Error('인증 실패 또는 DB 오류');
      const data = await res.json();
      setResults(data);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = results.filter(r => {
    if (filter === 'detected') return r.blink_detected;
    if (filter === 'not_detected') return !r.blink_detected;
    return true;
  });

  const exportCSV = () => {
    const headers = ['날짜', '환자명', '보호자명', '연락처', '지역', '소통방법', '영상URL', '기기', '메모'];
    const rows = results.map(r => [
      new Date(r.created_at).toLocaleString('ko-KR'),
      r.patient_name, r.caregiver_name, r.caregiver_contact, r.region,
      r.communication_method ?? '',
      r.video_url ?? '',
      r.device_type ?? '',
      (r.note ?? '').replace(/,/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'morspeak_screening.csv'; a.click();
  };

  const badge = (detected: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
    background: detected ? '#e8f8ee' : '#fff3e0',
    color: detected ? '#34C759' : '#FF9500',
  });

  const s = {
    page: { minHeight: '100vh', background: '#f5f5f7', padding: '40px 24px', fontFamily: "'PretendardVariable', -apple-system, sans-serif" } as React.CSSProperties,
    card: { background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: '960px', margin: '0 auto' } as React.CSSProperties,
  };

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, maxWidth: '360px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1f', marginBottom: '8px' }}>관리자 로그인</h1>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px' }}>모스픽 내부 관계자만 접근 가능합니다.</p>
        <input
          type="password" placeholder="비밀번호"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(password)}
          style={{ width: '100%', padding: '12px', border: '1.5px solid #e0e0e0', borderRadius: '10px', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none' }}
        />
        {error && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button onClick={() => fetchResults(password)} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#1d1d1f', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? '로딩 중...' : '확인'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1f', marginBottom: '4px' }}>눈 깜빡임 테스트 결과</h1>
            <p style={{ fontSize: '13px', color: '#aaa' }}>총 {results.length}명 중 {results.filter(r => r.blink_detected).length}명 감지됨</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'detected', 'not_detected'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
                borderColor: filter === f ? '#1d1d1f' : '#e0e0e0',
                background: filter === f ? '#1d1d1f' : '#fff',
                color: filter === f ? '#fff' : '#666',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}>
                {f === 'all' ? '전체' : f === 'detected' ? '감지됨' : '미감지'}
              </button>
            ))}
            <button onClick={exportCSV} style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #e0e0e0', background: '#fff', color: '#666', fontSize: '12px', cursor: 'pointer' }}>
              CSV 다운로드
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' as const }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['날짜', '환자명', '보호자명', '연락처', '지역', '소통방법', '영상', '기기', '메모'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#aaa', fontWeight: 500, whiteSpace: 'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' as const, color: '#888' }}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1d1d1f' }}>{r.patient_name}</td>
                  <td style={{ padding: '12px' }}>{r.caregiver_name}</td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' as const }}>{r.caregiver_contact}</td>
                  <td style={{ padding: '12px' }}>{r.region}</td>
                  <td style={{ padding: '12px', color: '#888' }}>{r.communication_method ?? '-'}</td>
                  <td style={{ padding: '12px' }}>
                    {r.video_url
                      ? <a href={r.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', fontSize: '12px', textDecoration: 'none' }}>영상 보기 ↗</a>
                      : <span style={{ color: '#ccc', fontSize: '12px' }}>없음</span>}
                  </td>
                  <td style={{ padding: '12px', color: '#aaa' }}>{r.device_type ?? '-'}</td>
                  <td style={{ padding: '12px', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.note ?? '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
