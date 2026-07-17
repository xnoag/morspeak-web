'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SURVEY_QUESTIONS, SurveyAnswers, SurveyQuestion, formatAnswerLabel } from '@/lib/survey-questions';

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

function fmtDevice(deviceType: string | null) {
  if (deviceType === 'mobile') return '모바일';
  if (deviceType === 'tablet') return '태블릿';
  if (deviceType === 'desktop') return 'PC';
  return '—';
}

// 이 페이지는 전부 인라인 스타일이라(프로젝트 관례) 미디어쿼리 대신 뷰포트 너비를 직접 감지해서
// 좁은 화면에서는 카드 목록으로, 넓은 화면에서는 목록+상세 2단 레이아웃으로 보여준다.
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

const SECTION_LABELS: Record<string, string> = {
  A: '기존 의사소통 방식 및 돌봄 상황',
  B: '의사소통 및 일상 참여 범위',
  C: '니즈 및 기대사항',
};

interface QuestionGroup { label: string | null; questions: SurveyQuestion[] }
interface QuestionSection { key: string; label: string; groups: QuestionGroup[] }

// SURVEY_QUESTIONS는 이미 A1~A8, B1~B17(측면별로 연속), C1~C3 순으로 정렬돼 있어서
// 한 번 훑으면서 section/group이 바뀔 때마다 새 묶음을 만들면 된다.
const GROUPED_QUESTIONS: QuestionSection[] = (() => {
  const sections: QuestionSection[] = [];
  for (const q of SURVEY_QUESTIONS) {
    let section = sections[sections.length - 1];
    if (!section || section.key !== q.section) {
      section = { key: q.section, label: SECTION_LABELS[q.section] ?? q.section, groups: [] };
      sections.push(section);
    }
    const groupLabel = q.group ?? null;
    let group = section.groups[section.groups.length - 1];
    if (!group || group.label !== groupLabel) {
      group = { label: groupLabel, questions: [] };
      section.groups.push(group);
    }
    group.questions.push(q);
  }
  return sections;
})();

function totalDurationSec(r: SurveyRow) {
  return Object.values(r.questionTimes ?? {}).reduce((sum, v) => sum + (v || 0), 0);
}
function totalChanges(r: SurveyRow) {
  return SURVEY_QUESTIONS.reduce((sum, q) => sum + Math.max(0, (r.answerHistory?.[q.id]?.length ?? 0) - 1), 0);
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? '#1d1d1f' }}>{value}</div>
    </div>
  );
}

function QuestionRow({ q, r, isMobile }: { q: SurveyQuestion; r: SurveyRow; isMobile: boolean }) {
  const history = r.answerHistory?.[q.id] ?? [];
  if (isMobile) {
    return (
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#8e8e93', fontFamily: M, fontSize: 11, flexShrink: 0 }}>{q.id}</span>
          <span style={{ color: '#aeaeb2', fontFamily: M, fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDuration(r.questionTimes?.[q.id])}</span>
        </div>
        <div style={{ color: '#636366', fontSize: 12.5, marginBottom: 6, lineHeight: 1.4 }}>{q.title}</div>
        <div style={{ color: '#1d1d1f', fontWeight: 600, fontSize: 13.5, whiteSpace: 'pre-line' }}>{formatAnswerLabel(q, r.answers)}</div>
        {history.length > 1 && (
          <div style={{ color: '#ff9500', fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
            변경 {history.length - 1}회: {history.join(' → ')}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 14, padding: '12px 16px' }}>
      <span style={{ color: '#c7c7cc', fontFamily: M, fontSize: 11, width: 30, flexShrink: 0, paddingTop: 2 }}>{q.id}</span>
      <span style={{ color: '#636366', fontSize: 13, flex: 1, lineHeight: 1.5, paddingTop: 1 }}>{q.title}</span>
      <span style={{ color: '#c7c7cc', fontFamily: M, fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2 }}>
        {fmtDuration(r.questionTimes?.[q.id])}
      </span>
      <div style={{ maxWidth: 300, textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: '#1d1d1f', fontWeight: 600, fontSize: 13, whiteSpace: 'pre-line' }}>{formatAnswerLabel(q, r.answers)}</div>
        {history.length > 1 && (
          <div style={{ color: '#ff9500', fontSize: 11, marginTop: 3 }}>
            변경 {history.length - 1}회: {history.join(' → ')}
          </div>
        )}
      </div>
    </div>
  );
}

// PC 상세 패널: 요약 바 + [A]/[B]/[C] 섹션(B는 측면별 소그룹)으로 나눠서 보여준다 —
// 28개 문항을 한 줄로 쭉 나열하는 대신 주제별로 묶어야 훑어보기 쉬워진다.
function DetailPanel({ r }: { r: SurveyRow }) {
  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{r.caregiverName || '이름 없음'}</div>
            <div style={{ fontSize: 13, color: '#8e8e93', fontFamily: M, marginTop: 3 }}>{r.caregiverContact || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#8e8e93', marginBottom: 3 }}>제출일시</div>
            <div style={{ fontSize: 13, color: '#1d1d1f', fontFamily: M }}>{fmtDate(r.createdAt)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid #f2f2f7' }}>
          <Stat label="환자분" value={r.patientName || '—'} />
          <Stat label="총 소요시간" value={fmtDuration(totalDurationSec(r))} color="#007AFF" />
          <Stat label="답변 변경" value={`${totalChanges(r)}회`} color={totalChanges(r) > 0 ? '#ff9500' : undefined} />
          <Stat label="기기" value={fmtDevice(r.deviceType)} />
        </div>
      </div>

      {GROUPED_QUESTIONS.map((section) => (
        <div key={section.key} style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#007AFF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            [{section.key}] {section.label}
          </div>
          {section.groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              {group.label && <div style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 8 }}>{group.label}</div>}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {group.questions.map((q, qi) => (
                  <div key={q.id} style={{ borderTop: qi > 0 ? '1px solid #f2f2f7' : 'none' }}>
                    <QuestionRow q={q} r={r} isMobile={false} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SurveyAdminPage() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null); // 모바일: 펼친 카드 id
  const [selectedId, setSelectedId] = useState<string | null>(null); // PC: 선택된 응답 id

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

  // PC에서 목록만 보고 아무것도 못 고른 상태로 비어있지 않게, 로드되면 첫 응답을 자동으로 선택한다.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);
  const selectedRow = filtered.find((r) => r.id === selectedId) ?? null;

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f2f2f7', fontFamily: F }}>
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
        <div style={{ display: 'flex', gap: 8 }}>
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

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30', fontSize: 13 }}>{error}</div>
      ) : isMobile ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>총 응답</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#007AFF', letterSpacing: '-.5px' }}>{rows.length}건</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#34c759', letterSpacing: '-.5px' }}>{todayCount}건</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>사전 설문 응답</span>
            <span style={{ fontSize: 12, color: '#8e8e93', background: '#e5e5ea', padding: '2px 8px', borderRadius: 20 }}>{filtered.length}건</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
          ) : (
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
                        <div style={{ display: 'grid', gap: 14 }}>
                          {SURVEY_QUESTIONS.map((q) => <QuestionRow key={q.id} q={q} r={r} isMobile />)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // PC: 좌측 응답 목록 + 우측 선택된 응답의 상세(요약 바 + 섹션별 문항)를 같이 보여주는
        // 2단 레이아웃. 아코디언 방식(행 펼치기)보다 여러 응답을 빠르게 훑어보기에 낫다.
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 320, flexShrink: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f2f2f7', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.05em' }}>총 응답</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#007AFF' }}>{rows.length}건</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#34c759' }}>{todayCount}건</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>사전 설문 응답 <span style={{ color: '#8e8e93', fontWeight: 500 }}>{filtered.length}건</span></div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
              ) : (
                filtered.map((r) => {
                  const selected = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
                        border: 'none', borderBottom: '1px solid #f2f2f7', borderLeft: selected ? '3px solid #007AFF' : '3px solid transparent',
                        background: selected ? '#f0f7ff' : '#fff', cursor: 'pointer', fontFamily: F,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: selected ? '#007AFF' : '#1d1d1f' }}>{r.caregiverName || '이름 없음'}</span>
                        <span style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M }}>{fmtDate(r.createdAt).replace(/^\d+\. /, '')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8e8e93', fontFamily: M }}>{r.caregiverContact || '—'}</div>
                      <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>환자: {r.patientName || '—'}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
            {selectedRow ? (
              <DetailPanel r={selectedRow} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 13 }}>
                왼쪽에서 응답을 선택해주세요.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
