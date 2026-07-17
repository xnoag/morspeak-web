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
  questionTimes?: Record<string, number>;
  answerHistory?: Record<string, string[]>;
  deviceType: string | null;
}

function fmtDate(ts?: Timestamp) {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(sec?: number) {
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

// 이 페이지는 전부 인라인 스타일이라(프로젝트 관례) 미디어쿼리 대신 뷰포트 너비를 직접 감지해서
// 좁은 화면에서는 표 대신 카드 목록으로, 문항 상세도 가로 배치 대신 세로로 쌓아 보여준다.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 720);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function QuestionDetail({ r, isMobile }: { r: SurveyRow; isMobile: boolean }) {
  return (
    <div style={{ display: 'grid', gap: isMobile ? 14 : 8 }}>
      {SURVEY_QUESTIONS.map((q) => {
        const history = r.answerHistory?.[q.id] ?? [];
        if (isMobile) {
          return (
            <div key={q.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#8e8e93', fontFamily: M, fontSize: 11, flexShrink: 0 }}>{q.id}</span>
                <span style={{ color: '#aeaeb2', fontFamily: M, fontSize: 11, whiteSpace: 'nowrap' }}>
                  {fmtDuration(r.questionTimes?.[q.id])}
                </span>
              </div>
              <div style={{ color: '#636366', fontSize: 12.5, marginBottom: 6, lineHeight: 1.4 }}>{q.title}</div>
              <div style={{ color: '#1d1d1f', fontWeight: 600, fontSize: 13.5, whiteSpace: 'pre-line' }}>
                {formatAnswerLabel(q, r.answers)}
              </div>
              {history.length > 1 && (
                <div style={{ color: '#ff9500', fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
                  변경 {history.length - 1}회: {history.join(' → ')}
                </div>
              )}
            </div>
          );
        }
        return (
          <div key={q.id} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#8e8e93', minWidth: 32, fontFamily: M, flexShrink: 0 }}>{q.id}</span>
            <span style={{ color: '#636366', flex: 1 }}>{q.title}</span>
            <span style={{ color: '#aeaeb2', fontFamily: M, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {fmtDuration(r.questionTimes?.[q.id])}
            </span>
            <div style={{ maxWidth: 320, textAlign: 'right' }}>
              <div style={{ color: '#1d1d1f', fontWeight: 600, whiteSpace: 'pre-line' }}>
                {formatAnswerLabel(q, r.answers)}
              </div>
              {history.length > 1 && (
                <div style={{ color: '#ff9500', fontSize: 11, marginTop: 2 }}>
                  변경 {history.length - 1}회: {history.join(' → ')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SurveyAdminPage() {
  const isMobile = useIsMobile();
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
        ...SURVEY_QUESTIONS.map((q) => {
          const history = r.answerHistory?.[q.id] ?? [];
          const historyNote = history.length > 1 ? `\n[변경 이력] ${history.join(' → ')}` : '';
          return `${formatAnswerLabel(q, r.answers)} (${fmtDuration(r.questionTimes?.[q.id])})${historyNote}`;
        }),
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

  const iconBtn = {
    height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: F, color: 'rgba(255,255,255,0.9)',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>
      <div
        style={{
          background: '#1d1d1f',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          padding: isMobile ? '10px 14px' : '0 24px',
          height: isMobile ? undefined : 56,
          gap: isMobile ? 8 : 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px', flex: isMobile ? 1 : undefined }}>모스픽 설문 관리</span>
          {isMobile && (
            <button
              onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login'; }}
              style={iconBtn}
            >
              로그아웃
            </button>
          )}
        </div>
        {!isMobile && <div style={{ flex: 1 }} />}
        <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'row' : 'row' }}>
          <input
            placeholder="이름·연락처 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 12, paddingRight: 12, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', fontSize: 13, outline: 'none', fontFamily: F, flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 200, color: '#fff' }}
          />
          <button onClick={exportExcel} style={{ ...iconBtn, flexShrink: 0 }}>
            엑셀 내보내기
          </button>
          {!isMobile && (
            <button
              onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login'; }}
              style={{ ...iconBtn, color: 'rgba(255,255,255,0.7)' }}
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 12px' : '24px 28px' }}>
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 24, maxWidth: isMobile ? undefined : 480 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: isMobile ? '14px 16px' : '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>총 응답</div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#007AFF', letterSpacing: '-.5px' }}>{rows.length}건</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: isMobile ? '14px 16px' : '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#34c759', letterSpacing: '-.5px' }}>{todayCount}건</div>
            </div>
          </div>
        )}

        <div style={{ background: isMobile ? 'transparent' : '#fff', borderRadius: 16, border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.07)', boxShadow: isMobile ? 'none' : '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '4px 4px 10px' : '14px 20px', borderBottom: isMobile ? 'none' : '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>사전 설문 응답</span>
            <span style={{ fontSize: 12, color: '#8e8e93', background: isMobile ? '#e5e5ea' : '#f2f2f7', padding: '2px 8px', borderRadius: 20 }}>{filtered.length}건</span>
          </div>

          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
          ) : error ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#FF3B30', fontSize: 13 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
          ) : isMobile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 16px', fontFamily: F, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{r.caregiverName || '—'}</span>
                        <span style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M }}>{fmtDate(r.createdAt)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13, color: '#636366', fontFamily: M }}>{r.caregiverContact || '—'}</span>
                        <span style={{ fontSize: 12, color: '#8e8e93' }}>환자: {r.patientName || '—'}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#007AFF', fontWeight: 600 }}>{expanded ? '접기 ▲' : '전체 응답 보기 ▼'}</div>
                    </button>
                    {expanded && (
                      <div style={{ padding: '4px 12px 14px', background: '#fafafa', borderTop: '1px solid #f2f2f7' }}>
                        <QuestionDetail r={r} isMobile />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                          <QuestionDetail r={r} isMobile={false} />
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
