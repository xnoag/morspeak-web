'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SURVEY_QUESTIONS, SurveyAnswers, formatAnswerLabel } from '@/lib/survey-questions';

const F = "system-ui,-apple-system,'SF Pro Text',sans-serif";
const M = "'SF Mono','Fira Mono','Cascadia Mono',monospace";

interface SurveyRow {
  id: string;
  createdAt?: Timestamp;
  surveyType: string;
  patientName: string | null;
  caregiverName: string | null;
  caregiverContact: string | null;
  answers: SurveyAnswers;
  deviceType: string | null;
}

function fmtDate(ts?: Timestamp) {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SurveyAdminPage() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // surveyType은 클라이언트에서 필터링한다 — where+orderBy 조합은 Firestore 복합 인덱스가
    // 별도로 필요해서(콘솔에서 생성해야 함), 응답 건수가 적은 이 용도에서는 굳이 안 만든다.
    const q = query(collection(db, 'survey_responses'), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then((snap) =>
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as SurveyRow))
            .filter((r) => r.surveyType === 'pre')
        )
      )
      .catch((e) => { console.error('[survey-admin]', e); setError('응답을 불러오는 중 오류가 발생했습니다.'); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          r.caregiverName?.includes(search) ||
          r.caregiverContact?.includes(search) ||
          r.patientName?.includes(search)
      ),
    [rows, search]
  );

  const today = new Date().toDateString();
  const todayCount = rows.filter((r) => r.createdAt?.toDate().toDateString() === today).length;

  async function exportExcel() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('사전 설문 응답');
    const headers = ['제출일시', '보호자명', '연락처', '환자명', ...SURVEY_QUESTIONS.map((q) => q.id)];
    ws.addRow(headers);
    filtered.forEach((r) => {
      ws.addRow([
        fmtDate(r.createdAt),
        r.caregiverName ?? '',
        r.caregiverContact ?? '',
        r.patientName ?? '',
        ...SURVEY_QUESTIONS.map((q) => formatAnswerLabel(q, r.answers)),
      ]);
    });
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `모스픽_사전설문_응답_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>
      <div style={{ height: 56, background: '#1d1d1f', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px' }}>모스픽 설문 관리</span>
        <div style={{ flex: 1 }} />
        <input
          placeholder="이름·연락처 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 12, paddingRight: 12, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', fontSize: 13, outline: 'none', fontFamily: F, width: 200, color: '#fff' }}
        />
        <button
          onClick={exportExcel}
          style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: F, color: 'rgba(255,255,255,0.9)' }}
        >
          엑셀 내보내기
        </button>
        <button
          onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login'; }}
          style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: F, color: 'rgba(255,255,255,0.7)' }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 24, maxWidth: 480 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>총 응답</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#007AFF', letterSpacing: '-.5px' }}>{rows.length}건</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#34c759', letterSpacing: '-.5px' }}>{todayCount}건</div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>사전 설문 응답</span>
            <span style={{ fontSize: 12, color: '#8e8e93', background: '#f2f2f7', padding: '2px 8px', borderRadius: 20 }}>{filtered.length}건</span>
          </div>

          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
          ) : error ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#FF3B30', fontSize: 13 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f2f2f7' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em' }}>제출일시</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em' }}>보호자</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em' }}>연락처</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.06em' }}>환자</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                      style={{ borderBottom: '1px solid #f7f7f7', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '13px 20px', fontFamily: M, fontSize: 12, color: '#636366' }}>{fmtDate(r.createdAt)}</td>
                      <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{r.caregiverName || '—'}</td>
                      <td style={{ padding: '13px 20px', fontFamily: M, fontSize: 13, color: '#1d1d1f' }}>{r.caregiverContact || '—'}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, color: '#1d1d1f' }}>{r.patientName || '—'}</td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={4} style={{ padding: '20px 24px', background: '#fafafa', borderBottom: '1px solid #f2f2f7' }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {SURVEY_QUESTIONS.map((q) => (
                              <div key={q.id} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                                <span style={{ color: '#8e8e93', minWidth: 32, fontFamily: M, flexShrink: 0 }}>{q.id}</span>
                                <span style={{ color: '#636366', flex: 1 }}>{q.title}</span>
                                <span style={{ color: '#1d1d1f', fontWeight: 600, maxWidth: 320, textAlign: 'right' }}>
                                  {formatAnswerLabel(q, r.answers)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
