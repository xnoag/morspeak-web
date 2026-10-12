'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SurveyQuestion, formatAnswerLabel } from '@/lib/survey-questions';
import SurveyMindMap, { SummaryQuestion } from '@/components/SurveyMindMap';
import { SURVEY_STAGES, getStageQuestions, FOLLOWUP_VERSION, FOLLOWUP_SECTION_LABELS, type SurveyStage } from '@/lib/survey-stages';
import { followupId, followupPayload, positiveExample, isRecorded, visibleFollowup, type SurveyRow } from '@/lib/survey-records';
import { relatedPreQuestions, trendFollowup, scoreChange } from '@/lib/survey-trends';
import SurveyParticipantTrend from '@/components/SurveyParticipantTrend';
import SurveyFollowupEditor from '@/components/SurveyFollowupEditor';

const F = "system-ui,-apple-system,'SF Pro Text',sans-serif";
const M = "'SF Mono','Fira Mono','Cascadia Mono',monospace";


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
  D: '모스픽 도입 과정',
};

interface QuestionGroup { label: string | null; questions: SurveyQuestion[] }
interface QuestionSection { key: string; label: string; groups: QuestionGroup[] }

// 선택한 단계의 문항을 섹션과 주제별로 묶는다.
function groupQuestions(questions: SurveyQuestion[]): QuestionSection[] {
  const sections: QuestionSection[] = [];
  for (const q of questions) {
    let section = sections[sections.length - 1];
    if (!section || section.key !== q.section) {
      section = { key: q.section, label: (q.id.includes('-') ? FOLLOWUP_SECTION_LABELS[q.section] : SECTION_LABELS[q.section]) ?? q.section, groups: [] };
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
}

function totalDurationSec(r: SurveyRow) {
  return Object.values(r.questionTimes ?? {}).reduce((sum, v) => sum + (v || 0), 0);
}
function totalChanges(r: SurveyRow) {
  return Object.values(r.answerHistory ?? {}).reduce((sum, history) => sum + Math.max(0, history.length - 1), 0);
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
function DetailPanel({ r, questions, onDelete }: { r: SurveyRow; questions: SurveyQuestion[]; onDelete?: (r: SurveyRow) => void }) {
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
            <div style={{ fontSize: 13, color: '#1d1d1f', fontFamily: M, marginBottom: 10 }}>{fmtDate(r.createdAt)}</div>
            {onDelete && <button
              onClick={() => onDelete(r)}
              style={{ fontSize: 12, fontWeight: 600, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: F }}
            >
              이 응답 삭제
            </button>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid #f2f2f7' }}>
          <Stat label="환자분" value={r.patientName || '—'} />
          <Stat label="총 소요시간" value={fmtDuration(totalDurationSec(r))} color="#007AFF" />
          <Stat label="답변 변경" value={`${totalChanges(r)}회`} color={totalChanges(r) > 0 ? '#ff9500' : undefined} />
          <Stat label="기기" value={fmtDevice(r.deviceType)} />
        </div>
      </div>

      {r.collectedOn && <p style={{ fontSize: 13 }}>조사일: {r.collectedOn}</p>}
      {r.interviewNotes && <div style={{ padding: 16, background: '#fff', borderRadius: 12, marginBottom: 20, whiteSpace: 'pre-wrap', fontSize: 13 }}>인터뷰 원문·기록 메모<br />{r.interviewNotes}</div>}
      {groupQuestions(questions).map((section) => (
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

// 응답자가 행, 문항이 열인 표 형태로 전체 응답을 한 화면에서 훑어볼 수 있게 한다 —
// 엑셀 내보내기와 같은 데이터 구조를 화면에서 그대로 보여주는 버전.
function TableView({ rows, questions }: { rows: SurveyRow[]; questions: SurveyQuestion[] }) {
  const cellStyle = { padding: '10px 14px', fontSize: 12.5, color: '#1d1d1f', whiteSpace: 'nowrap' as const, borderBottom: '1px solid #f2f2f7', verticalAlign: 'top' as const };
  const headStyle = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#636366', textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: '2px solid #e5e5ea', position: 'sticky' as const, top: 0, background: '#fafafa', verticalAlign: 'top' as const };
  const questionHeadStyle = { ...headStyle, whiteSpace: 'normal' as const, minWidth: 180, maxWidth: 260, lineHeight: 1.4 };
  return (
    <div style={{ overflow: 'auto', flex: 1, background: '#fff' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={headStyle}>제출일시</th>
            <th style={headStyle}>보호자명</th>
            <th style={headStyle}>연락처</th>
            <th style={headStyle}>환자명</th>
            {questions.map((q) => (
              <th key={q.id} style={questionHeadStyle}>
                <div style={{ color: '#007AFF', fontSize: 10, marginBottom: 3 }}>{q.id}</div>
                <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{q.title}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...cellStyle, fontFamily: M, color: '#8e8e93', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
              <td style={{ ...cellStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.caregiverName || '—'}</td>
              <td style={{ ...cellStyle, fontFamily: M, whiteSpace: 'nowrap' }}>{r.caregiverContact || '—'}</td>
              <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{r.patientName || '—'}</td>
              {questions.map((q) => (
                <td key={q.id} style={cellStyle}>{formatAnswerLabel(q, r.answers)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowupPanel({ source, record, questions, isMobile, onEdit, onTrend, onDelete }: {
  source: SurveyRow; record?: SurveyRow; questions: SurveyQuestion[]; isMobile: boolean;
  onEdit: () => void; onTrend: () => void; onDelete: (r: SurveyRow) => void;
}) {
  const row = record ?? { ...source, id: 'pending', answers: {}, createdAt: undefined, questionTimes: {}, answerHistory: {}, deviceType: 'manual' };
  return <div>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, color: '#636366', marginRight: 'auto' }}>{record ? record.recordStatus === 'recorded' ? '응답 완료' : record.recordStatus === 'example' ? '가상 초안 · 실제 응답/성과 집계 제외' : '작성 중 · 집계 제외' : '아직 입력하지 않았습니다.'}</span>
      <button onClick={onEdit} style={{ minHeight: 44, border: '1px solid #c7c7cc', borderRadius: 9999, padding: '0 16px', background: '#fff', cursor: 'pointer' }}>{record ? '답변 수정' : '답변 입력'}</button>
      <button onClick={onTrend} style={{ minHeight: 44, border: '1px solid #c7c7cc', borderRadius: 9999, padding: '0 16px', background: '#fff', cursor: 'pointer' }}>개인별 추이</button>
    </div>
    {isMobile ? <div style={{ display: 'grid', gap: 8 }}>{questions.map((q) => <QuestionRow key={q.id} q={q} r={row} isMobile />)}</div> : <DetailPanel r={row} questions={questions} onDelete={record ? onDelete : undefined} />}
  </div>;
}

export default function SurveyAdminPage() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<SurveyStage>('pre');
  const questions = useMemo(() => getStageQuestions(stage), [stage]);
  const stageRows = useMemo(() => rows.filter((r) => r.surveyType === stage && isRecorded(r) && (stage === 'pre' || r.surveyVersion === FOLLOWUP_VERSION)), [rows, stage]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null); // 모바일: 펼친 카드 id
  const [selectedId, setSelectedId] = useState<string | null>(null); // PC: 선택된 응답 id
  const [viewMode, setViewMode] = useState<'detail' | 'table' | 'summary' | 'questions' | 'entry' | 'trend'>('detail'); // PC: 목록+상세 / 전체 표 / 문항별 요약

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [exampleMode, setExampleMode] = useState(false);
  const [entryDirty, setEntryDirty] = useState(false);
  const [trendExample, setTrendExample] = useState(true);
  const [preparingExamples, setPreparingExamples] = useState(false);
  const [exampleMessage, setExampleMessage] = useState('');
  async function prepareExamples() {
    if (!canLeaveEntry()) return;
    setPreparingExamples(true); setExampleMessage('');
    let created = 0, kept = 0, failed = 0;
    const newRows: SurveyRow[] = [];
    for (const person of rows.filter((r) => r.surveyType === 'pre')) {
      for (const phase of ['mid', 'post'] as const) {
        const id = followupId(person.id, phase, true);
        const payload = followupPayload(person, phase, positiveExample(phase), '', '가상 검토 시나리오: 중간보다 사후에 대부분의 항목이 좋아지고 일부는 같은 상태입니다. 실제 인터뷰 원문이 아닙니다.', 'example');
        try {
          const made = await runTransaction(db, async (transaction) => {
            const original = await transaction.get(doc(db, 'survey_responses', person.id));
            const ref = doc(db, 'survey_responses', id);
            const existing = await transaction.get(ref);
            if (!original.exists() || original.data().surveyType !== 'pre') throw new Error('사전 기록을 확인할 수 없습니다.');
            if (existing.exists()) return false;
            transaction.set(ref, { ...payload, revision: 1, revisionHistory: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            return true;
          });
          if (made) { created++; newRows.push({ ...payload, id, revision: 1, createdAt: Timestamp.now() }); } else kept++;
        } catch { failed++; }
      }
    }
    setRows((previous) => [...previous, ...newRows]); setPreparingExamples(false);
    setExampleMessage(`가상 초안 ${created}건 생성 · 기존 ${kept}건 보존${failed ? ` · 실패 ${failed}건 (다시 실행하면 기존 기록은 보존됩니다)` : ''}. 실제 응답 집계에서 제외됩니다.`);
    setViewMode('trend'); setTrendExample(true);
  }
  function canLeaveEntry() {
    if (!entryDirty) return true;
    if (!confirm('저장하지 않은 입력이 있습니다. 저장하지 않고 이동할까요?')) return false;
    setEntryDirty(false);
    return true;
  }

  useEffect(() => {
    // surveyType은 클라이언트에서 필터링한다 — where+orderBy 조합은 Firestore 복합 인덱스가
    // 별도로 필요해서(콘솔에서 생성해야 함), 응답 건수가 적은 이 용도에서는 굳이 안 만든다.
    const q = query(collection(db, 'survey_responses'), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then((snap) =>
        setRows(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as SurveyRow))
        )
      )
      .catch((e) => { console.error('[survey-admin]', e); setError('응답을 불러오는 중 오류가 발생했습니다.'); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      (stage === 'pre' ? stageRows : rows.filter((r) => r.surveyType === 'pre').map((r) => visibleFollowup(rows, r.id, stage)).filter((r): r is SurveyRow => !!r && (isRecorded(r) || r.recordStatus === 'example'))).filter(
        (r) =>
          !search ||
          r.caregiverName?.includes(search) ||
          r.caregiverContact?.includes(search) ||
          r.patientName?.includes(search)
      ),
    [stageRows, rows, stage, search]
  );

  const participants = rows.filter((r) => r.surveyType === 'pre' && (!search || r.patientName?.includes(search) || r.caregiverName?.includes(search) || r.caregiverContact?.includes(search)));
  const source = participants.find((r) => r.id === sourceId) ?? participants[0];
  const entryRecord = source && stage !== 'pre' ? rows.find((r) => r.id === followupId(source.id, stage, exampleMode)) : undefined;

  const listRows = viewMode === 'trend' || stage !== 'pre' ? participants : filtered;
  const selectedParticipant = listRows.find((r) => r.id === selectedId) ?? listRows.find((r) => r.id === sourceId) ?? listRows[0];
  const selectedFollowup = selectedParticipant && stage !== 'pre' ? visibleFollowup(rows, selectedParticipant.id, stage) : undefined;
  function participantStatus(person: SurveyRow) {
    if (stage === 'pre') return fmtDate(person.createdAt).replace(/^\d+\. /, '');
    const record = visibleFollowup(rows, person.id, stage);
    return record ? record.recordStatus === 'recorded' ? record.collectedOn || '응답 완료' : record.recordStatus === 'example' ? '가상 초안' : '작성 중' : '미입력';
  }
  function editParticipant(person: SurveyRow) { setSourceId(person.id); setSelectedId(person.id); setExampleMode(stage !== 'pre' && visibleFollowup(rows, person.id, stage)?.recordStatus === 'example'); setViewMode('entry'); }
  function trendParticipant(person: SurveyRow) { setSourceId(person.id); setSelectedId(person.id); setViewMode('trend'); }

  const selectedRow = filtered.find((r) => r.id === selectedId) ?? filtered.find((r) => r.id === sourceId) ?? filtered[0] ?? null;

  async function handleDelete(r: SurveyRow) {
    if (!confirm(`${r.caregiverName || '이름 없음'}님의 응답을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    await deleteDoc(doc(db, 'survey_responses', r.id));
    setRows((prev) => prev.filter((row) => row.id !== r.id));
    setSelectedId((id) => (id === r.id ? null : id));
    setExpandedId((id) => (id === r.id ? null : id));
  }

  const today = new Date().toDateString();
  const todayCount = stageRows.filter((r) => r.createdAt?.toDate().toDateString() === today).length;

  async function exportExcel() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    if (viewMode === 'trend' && selectedParticipant) {
      const ws = wb.addWorksheet(trendExample ? '가상 초안 추이 (성과 제외)' : '개인별 답변 추이');
      const mid = trendFollowup(rows, selectedParticipant.id, 'mid', trendExample);
      const post = trendFollowup(rows, selectedParticipant.id, 'post', trendExample);
      ws.addRow([trendExample ? '환자명 (가상 초안·성과 제외)' : '환자명', '보호자명', '문항', '사전 관련 원답변 (척도 다름)', '중간', '사후', '중간→사후 점수차', '중간 조사일', '사후 조사일']);
      getStageQuestions('mid').forEach((q) => ws.addRow([
        selectedParticipant.patientName, selectedParticipant.caregiverName, `${q.id}. ${q.title}`,
        relatedPreQuestions(q.id).map((pre) => `${pre.id}. ${pre.title}: ${formatAnswerLabel(pre, selectedParticipant.answers)}`).join('\n') || '대응 사전 문항 없음',
        mid ? formatAnswerLabel(q, mid.answers) : '미입력', post ? formatAnswerLabel(q, post.answers) : '미입력',
        scoreChange(q, mid, post, trendExample), mid?.collectedOn ?? '', post?.collectedOn ?? '',
      ]));
      ws.addRow(['인터뷰 원문', '', '', '', mid?.interviewNotes ?? '', post?.interviewNotes ?? '']);
      ws.getRow(1).font = { bold: true };
    } else {
    const hasExamples = filtered.some((r) => r.recordStatus === 'example');
    const ws = wb.addWorksheet(`${SURVEY_STAGES[stage]} ${hasExamples ? '가상 초안 포함' : '설문 응답'}`);
    const headers = ['제출일시', '보호자명', '연락처', '환자명', ...questions.map((q) => q.id), ...(stage === 'pre' ? [] : ['사전 응답 ID', '조사일', '인터뷰 원문', '문항 버전', '기록 구분'])];
    ws.addRow(headers);
    filtered.forEach((r) => {
      ws.addRow([
        fmtDate(r.createdAt),
        r.caregiverName ?? '',
        r.caregiverContact ?? '',
        r.patientName ?? '',
        ...questions.map((q) => {
          const history = r.answerHistory?.[q.id] ?? [];
          const historyNote = history.length > 1 ? `\n[변경 이력] ${history.join(' → ')}` : '';
          return `${formatAnswerLabel(q, r.answers)} (${fmtDuration(r.questionTimes?.[q.id])})${historyNote}`;
        }),
        ...(stage === 'pre' ? [] : [r.sourceResponseId ?? '', r.collectedOn ?? '', r.interviewNotes ?? '', r.surveyVersion ?? '', r.recordStatus === 'example' ? '가상 초안 · 실제 응답/성과 제외' : '실제 응답']),
      ]);
    });
    ws.getRow(1).font = { bold: true };
    }
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `모스픽_${viewMode === 'trend' ? `${trendExample ? '가상초안_' : ''}개인별답변추이` : `${SURVEY_STAGES[stage]}설문_${filtered.some((r) => r.recordStatus === 'example') ? '가상초안포함' : '응답'}`}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
          padding: isMobile ? '10px 14px' : '8px 24px',
          minHeight: 56,
          flexWrap: 'wrap',
          gap: isMobile ? 8 : 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-.3px', flex: isMobile ? 1 : undefined }}>모스픽 설문 관리</span>
          {isMobile && (
            <button
              onClick={async () => { if (!canLeaveEntry()) return; await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login'; }}
              style={iconBtn}
            >
              로그아웃
            </button>
          )}
        </div>
        {!isMobile && <div style={{ flex: 1 }} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
          <input
            placeholder="이름·연락처 검색..."
            value={search}
            onChange={(e) => { if (canLeaveEntry()) setSearch(e.target.value); }}
            style={{ paddingLeft: 12, paddingRight: 12, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', fontSize: 13, outline: 'none', fontFamily: F, flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 200, color: '#fff' }}
          />
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
              {([
                ...(stage === 'pre' ? [] : [['entry', '수기 입력']] as const),
                ['trend', '추이보기'],
                ['questions', '설문지'],
                ['summary', '요약보기'],
                ['detail', '상세보기'],
                ['table', '표로보기'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { if (canLeaveEntry()) { if (mode === 'entry' && selectedParticipant) editParticipant(selectedParticipant); else setViewMode(mode); } }}
                  style={{
                    height: 28, padding: '0 10px', borderRadius: 6, border: 'none',
                    background: viewMode === mode ? '#fff' : 'transparent',
                    color: viewMode === mode ? '#1d1d1f' : 'rgba(255,255,255,0.85)',
                    fontSize: 12, fontWeight: viewMode === mode ? 700 : 500, cursor: 'pointer', fontFamily: F,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button onClick={exportExcel} style={{ ...iconBtn, flexShrink: 0 }}>
            엑셀 내보내기
          </button>
          {!isMobile && (
            <button
              onClick={async () => { if (!canLeaveEntry()) return; await fetch('/api/admin/logout', { method: 'POST' }); location.href = '/tracking/login'; }}
              style={{ ...iconBtn, color: 'rgba(255,255,255,0.7)' }}
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexWrap: 'wrap', borderBottom: '1px solid #e5e5ea', background: '#fff' }}>
        <div role="group" aria-label="설문 단계" style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(SURVEY_STAGES) as SurveyStage[]).map((value) => (
            <button key={value} aria-pressed={stage === value} onClick={() => { if (!canLeaveEntry()) return; if (stage === 'pre' && selectedRow) setSourceId(selectedRow.id); setStage(value); setSelectedId(null); setExpandedId(null); setExampleMode(false); setViewMode('detail'); }}
              style={{ minHeight: 44, padding: '0 16px', border: 'none', borderRadius: 9999, background: stage === value ? '#1d1d1f' : '#f2f2f7', color: stage === value ? '#fff' : '#1d1d1f', cursor: 'pointer', fontFamily: F, fontSize: 13 }}>
              {SURVEY_STAGES[value]} {rows.filter((r) => r.surveyType === value && isRecorded(r) && (value === 'pre' || r.surveyVersion === FOLLOWUP_VERSION)).length}건{value !== 'pre' && rows.some((r) => r.surveyType === value && r.recordStatus === 'example') ? ` · 초안 ${rows.filter((r) => r.surveyType === value && r.recordStatus === 'example' && r.surveyVersion === FOLLOWUP_VERSION).length}건` : ''}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#636366' }}>{stage === 'pre' ? 'A · B · C' : 'A~E 공통 · H 변화 (6/24)'}</span>
        <button disabled={loading || preparingExamples} onClick={prepareExamples} style={{ minHeight: 44, border: '1px solid #c7c7cc', borderRadius: 9999, padding: '0 12px', background: '#fff', cursor: 'pointer', fontFamily: F, fontSize: 12 }}>{preparingExamples ? '가상 초안 준비 중…' : '전체 가상 초안 준비'}</button>
        {isMobile && <select aria-label="보기 방식" value={viewMode} onChange={(e) => { if (canLeaveEntry()) { if (e.target.value === 'entry' && selectedParticipant) editParticipant(selectedParticipant); else setViewMode(e.target.value as typeof viewMode); } }} style={{ minHeight: 44, fontFamily: F, fontSize: 13, marginLeft: 'auto' }}>
          {stage !== 'pre' && <option value="entry">수기 입력</option>}<option value="trend">추이보기</option><option value="questions">설문지</option><option value="summary">요약보기</option><option value="detail">상세보기</option><option value="table">표로보기</option>
        </select>}
      </div>

      {stage !== 'pre' && filtered.some((r) => r.recordStatus === 'example') && <p style={{ padding: '8px 16px', margin: 0, fontSize: 12, background: '#fff3cd' }}>가상 초안 포함 · 실제 조사 결과나 성과가 아닙니다. 실제 답변이 입력되면 우선 표시합니다.</p>}
      {exampleMessage && <p role="status" style={{ padding: '8px 16px', margin: 0, fontSize: 12, background: '#fff3cd' }}>{exampleMessage}</p>}
      {viewMode === 'entry' && stage !== 'pre' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28 }}>
          <h1 style={{ fontSize: 20, marginTop: 0 }}>{SURVEY_STAGES[stage]} 수기 입력</h1>
          <p style={{ fontSize: 13, color: '#636366' }}>사전 참여자를 선택해 이어서 기록합니다. F·G·S는 사전 전용이며 중간·사후에는 A~E와 H만 포함됩니다.</p>
          {loading ? <p>사전 참여자를 불러오는 중입니다.</p> : error ? <p role="alert">{error}</p> : participants.length === 0 ? <p>선택할 사전 참여자가 없습니다.</p> : <>
            <label style={{ display: 'block', fontSize: 13, maxWidth: 900 }}>사전 참여자
              <select value={source?.id ?? ''} onChange={(e) => { if (!canLeaveEntry()) return; setSourceId(e.target.value); setExampleMode(false); }} style={{ width: '100%', minHeight: 44, marginTop: 8, marginBottom: 16, padding: 8, fontFamily: F, fontSize: 14 }}>
                {participants.map((p) => <option key={p.id} value={p.id}>{p.patientName || '환자명 없음'} · 보호자 {p.caregiverName || '이름 없음'} · 중간 {rows.find((r) => r.id === followupId(p.id, 'mid'))?.recordStatus === 'recorded' ? '완료' : rows.some((r) => r.id === followupId(p.id, 'mid')) ? '작성 중' : '미입력'} · 사후 {rows.find((r) => r.id === followupId(p.id, 'post'))?.recordStatus === 'recorded' ? '완료' : rows.some((r) => r.id === followupId(p.id, 'post')) ? '작성 중' : '미입력'}</option>)}
              </select>
            </label>
            <div role="group" aria-label="입력 자료 구분" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {([false, true] as const).map((example) => <button key={String(example)} aria-pressed={exampleMode === example} onClick={() => { if (canLeaveEntry()) setExampleMode(example); }} style={{ minHeight: 44, padding: '0 16px', borderRadius: 9999, border: '1px solid #c7c7cc', background: exampleMode === example ? '#1d1d1f' : '#fff', color: exampleMode === example ? '#fff' : '#1d1d1f', cursor: 'pointer', fontFamily: F }}> {example ? '긍정적 변화 가상 초안' : '실제 수기 답변'}</button>)}
            </div>
            {source && <SurveyFollowupEditor key={`${source.id}-${stage}-${exampleMode}`} source={source} stage={stage} record={entryRecord} example={exampleMode} onDirtyChange={setEntryDirty} onSaved={(saved) => setRows((previous) => [...previous.filter((r) => r.id !== saved.id), saved])} />}
          </>}
        </div>
      ) : viewMode === 'questions' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28 }}>
          <h1 style={{ fontSize: 20, margin: '0 0 20px' }}>{SURVEY_STAGES[stage]} 설문지</h1>
          {groupQuestions(questions).map((section) => <section key={section.key} style={{ maxWidth: 800, marginBottom: 24 }}>
            <h2 style={{ fontSize: 15 }}>[{section.key}] {section.label}</h2>
            {section.groups.flatMap((group) => group.questions).map((q) => <div key={q.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{q.id}. {q.title}</div>
              {q.helperNote && <p style={{ fontSize: 12, color: '#636366' }}>{q.helperNote}</p>}
              <div style={{ fontSize: 12, color: '#636366', marginTop: 8 }}>{q.type === 'text' ? '직접 입력' : q.type === 'multiRanked' ? '중요한 순서대로 선택' : q.type === 'multi' ? '복수 선택' : '단일 선택'}</div>
              {q.options && <ol style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 0 }}>{q.options.map((o) => <li key={o.value}>{o.label}</li>)}</ol>}
            </div>)}
          </section>)}
        </div>
      ) : loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: 13 }}>불러오는 중...</div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30', fontSize: 13 }}>{error}</div>
      ) : viewMode === 'table' ? (
        <TableView rows={filtered} questions={questions} />
      ) : viewMode === 'summary' && stage !== 'pre' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28 }}>
          <h1 style={{ fontSize: 20 }}>{SURVEY_STAGES[stage]} 설문 요약 · {filtered.length}건</h1>
          {filtered.length === 0 ? <p style={{ color: '#636366' }}>응답이 없습니다. 설문지에서 문항을 확인할 수 있습니다.</p> :
            questions.map((q) => <div key={q.id} style={{ maxWidth: 800, background: '#fff', borderRadius: 12, marginBottom: 12, overflowX: 'auto' }}><div style={{ minWidth: 420 }}><SummaryQuestion q={q} rows={filtered} /></div></div>)}
        </div>
      ) : viewMode === 'summary' ? (
        <SurveyMindMap rows={filtered} />
      ) : isMobile && viewMode === 'trend' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <select aria-label="추이 참여자" value={selectedParticipant?.id ?? ''} onChange={(e) => { setSelectedId(e.target.value); setSourceId(e.target.value); }} style={{ minHeight: 44, width: '100%', marginBottom: 16 }}>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.patientName} · 보호자 {p.caregiverName}</option>)}
          </select>
          {selectedParticipant ? <SurveyParticipantTrend source={selectedParticipant} rows={rows} example={trendExample} onExampleChange={setTrendExample} /> : <p>사전 참여자가 없습니다.</p>}
        </div>
      ) : isMobile ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>실제 응답</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#007AFF', letterSpacing: '-.5px' }}>{stageRows.length}건</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#34c759', letterSpacing: '-.5px' }}>{todayCount}건</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>{SURVEY_STAGES[stage]} 설문 응답</span>
            <span style={{ fontSize: 12, color: '#8e8e93', background: '#e5e5ea', padding: '2px 8px', borderRadius: 20 }}>{filtered.length}건</span>
          </div>

          {listRows.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {listRows.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <button
                      onClick={() => { setSourceId(r.id); setSelectedId(r.id); setExpandedId((id) => (id === r.id ? null : r.id)); }}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 16px', fontFamily: F, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>{r.caregiverName || '—'}</span>
                        <span style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M }}>{participantStatus(r)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13, color: '#636366', fontFamily: M }}>{r.caregiverContact || '—'}</span>
                        <span style={{ fontSize: 12, color: '#8e8e93' }}>환자: {r.patientName || '—'}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#007AFF', fontWeight: 600 }}>{expanded ? '접기 ▲' : '전체 응답 보기 ▼'}</div>
                    </button>
                    {expanded && (
                      <div style={{ padding: '4px 12px 14px', background: '#fafafa', borderTop: '1px solid #f2f2f7' }}>
                        {stage === 'pre' ? <div style={{ display: 'grid', gap: 14 }}>{questions.map((q) => <QuestionRow key={q.id} q={q} r={r} isMobile />)}<button onClick={() => trendParticipant(r)} style={{ minHeight: 44 }}>개인별 추이</button></div> : <FollowupPanel source={r} record={visibleFollowup(rows, r.id, stage)} questions={questions} isMobile onEdit={() => editParticipant(r)} onTrend={() => trendParticipant(r)} onDelete={handleDelete} />}
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
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.05em' }}>실제 응답</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#007AFF' }}>{stageRows.length}건</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.05em' }}>오늘 응답</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#34c759' }}>{todayCount}건</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{viewMode === 'trend' ? '개인별 답변 추이' : `${SURVEY_STAGES[stage]} 설문 응답`} <span style={{ color: '#8e8e93', fontWeight: 500 }}>{viewMode === 'trend' ? `${participants.length}명` : `${filtered.length}건`}</span></div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {stage !== 'pre' && viewMode !== 'trend' && <p style={{ padding: '0 18px', fontSize: 12, color: '#636366' }}>사전 참여자 {participants.length}명 · 선택 후 답변 입력</p>}
              {listRows.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>응답이 없습니다.</div>
              ) : (
                listRows.map((r) => {
                  const selected = r.id === selectedParticipant?.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedId(r.id); setSourceId(r.id); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
                        border: 'none', borderBottom: '1px solid #f2f2f7', borderLeft: selected ? '3px solid #007AFF' : '3px solid transparent',
                        background: selected ? '#f0f7ff' : '#fff', cursor: 'pointer', fontFamily: F,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: selected ? '#007AFF' : '#1d1d1f' }}>{r.caregiverName || '이름 없음'}</span>
                        <span style={{ fontSize: 11, color: '#aeaeb2', fontFamily: M }}>{participantStatus(r)}</span>
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
            {viewMode === 'trend' && selectedParticipant ? <SurveyParticipantTrend source={selectedParticipant} rows={rows} example={trendExample} onExampleChange={setTrendExample} /> : stage !== 'pre' && selectedParticipant ? <FollowupPanel source={selectedParticipant} record={selectedFollowup} questions={questions} isMobile={false} onEdit={() => editParticipant(selectedParticipant)} onTrend={() => trendParticipant(selectedParticipant)} onDelete={handleDelete} /> : selectedRow ? (
              <><button onClick={() => trendParticipant(selectedRow)} style={{ minHeight: 44, marginBottom: 16, border: '1px solid #c7c7cc', borderRadius: 9999, padding: '0 16px', background: '#fff', cursor: 'pointer' }}>개인별 추이</button><DetailPanel r={selectedRow} questions={questions} onDelete={handleDelete} /></>
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
