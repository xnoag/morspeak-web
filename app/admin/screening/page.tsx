'use client';

import { useState } from 'react';

interface Result {
  id: string;
  created_at: string;
  patient_name: string;
  caregiver_name: string;
  caregiver_contact: string;
  region: string;
  sub_region: string | null;
  communication_method: string | null;
  video_url: string | null;
  device_type: string | null;
}

const font = "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

export default function AdminScreeningPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Result | null>(null);

  const fetchResults = async (pw: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/screening?password=${encodeURIComponent(pw)}`);
      if (!res.ok) throw new Error('비밀번호가 틀렸거나 DB 연결 오류입니다.');
      setResults(await res.json());
      setAuthed(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const filtered = results.filter(r =>
    !search || r.patient_name.includes(search) || r.caregiver_name.includes(search) || r.caregiver_contact.includes(search)
  );

  const exportCSV = () => {
    const headers = ['날짜', '환우명', '보호자명', '연락처', '지역', '세부지역', '소통방법', '영상URL', '기기'];
    const rows = results.map(r => [
      new Date(r.created_at).toLocaleString('ko-KR'),
      r.patient_name, r.caregiver_name, r.caregiver_contact,
      r.region, r.sub_region ?? '', r.communication_method ?? '',
      r.video_url ?? '', r.device_type ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'morspeak_screening.csv'; a.click();
  };

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 360, width: '100%', margin: '0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', marginBottom: 6 }}>관리자</h1>
        <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', marginBottom: 28 }}>모스픽 내부 관계자만 접근 가능합니다.</p>
        <input type="password" placeholder="비밀번호" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(password)}
          style={{ width: '100%', padding: '14px 16px', border: '1.5px solid rgba(60,60,67,0.18)', borderRadius: 980, fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: font, marginBottom: 12 }} />
        {error && <p style={{ color: '#FF3B30', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button onClick={() => fetchResults(password)} disabled={loading}
          style={{ width: '100%', padding: '15px', borderRadius: 980, border: 'none', background: '#1C1C1E', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
          {loading ? '확인 중...' : '로그인'}
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
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 2 }}>눈 깜빡임 테스트 결과</h1>
            <p style={{ fontSize: 13, color: 'rgba(60,60,67,0.6)' }}>총 {results.length}명 신청</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="이름, 연락처 검색" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid rgba(60,60,67,0.18)', borderRadius: 980, fontSize: 14, outline: 'none', fontFamily: font, width: 180 }} />
            <button onClick={exportCSV}
              style={{ padding: '8px 16px', borderRadius: 980, border: '1.5px solid rgba(60,60,67,0.18)', background: '#fff', color: 'rgba(60,60,67,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: font }}>
              CSV 다운로드
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
                {['날짜', '환우명', '보호자명', '연락처', '지역', '소통방법', '영상', '기기'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(60,60,67,0.5)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}
                  onClick={() => setSelected(r)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(60,60,67,0.07)' : 'none', cursor: 'pointer', background: selected?.id === r.id ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = selected?.id === r.id ? 'rgba(0,0,0,0.02)' : 'transparent')}
                >
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.5)', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#000' }}>{r.patient_name}</td>
                  <td style={{ padding: '14px 16px' }}>{r.caregiver_name}</td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>{r.caregiver_contact}</td>
                  <td style={{ padding: '14px 16px' }}>{r.sub_region ? `${r.region} ${r.sub_region}` : r.region}</td>
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.6)' }}>{r.communication_method ?? '-'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {r.video_url
                      ? <a href={r.video_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ color: '#1C1C1E', fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>영상 보기 ↗</a>
                      : <span style={{ color: '#ccc', fontSize: 13 }}>없음</span>}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'rgba(60,60,67,0.4)', fontSize: 13 }}>{r.device_type ?? '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: 'rgba(60,60,67,0.4)' }}>결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid rgba(60,60,67,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>{selected.patient_name} 상세</h2>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(60,60,67,0.4)', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: 20 }}>
              {[
                ['신청일', new Date(selected.created_at).toLocaleString('ko-KR')],
                ['환우명', selected.patient_name],
                ['보호자명', selected.caregiver_name],
                ['연락처', selected.caregiver_contact],
                ['지역', selected.sub_region ? `${selected.region} ${selected.sub_region}` : selected.region],
                ['소통방법', selected.communication_method ?? '-'],
                ['기기', selected.device_type ?? '-'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 15, color: '#000', fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>
            {selected.video_url && (
              <div>
                <p style={{ fontSize: 12, color: 'rgba(60,60,67,0.5)', marginBottom: 8 }}>녹화 영상</p>
                <video src={selected.video_url} controls style={{ width: '100%', maxWidth: 480, borderRadius: 12, background: '#000' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
