'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
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
function DetailPanel({ r, onDelete }: { r: SurveyRow; onDelete: (r: SurveyRow) => void }) {
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
            <button
              onClick={() => onDelete(r)}
              style={{ fontSize: 12, fontWeight: 600, color: '#FF3B30', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: F }}
            >
              이 응답 삭제
            </button>
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

// 문항별로 전체 응답자의 답변 분포를 막대그래프로 보여주는 요약 뷰 — 응답을 한 건씩
// 훑어보는 대신, 몇 명이 어떤 답을 골랐는지 문항 단위로 한눈에 파악할 수 있게 한다.
function optionCounts(q: SurveyQuestion, rows: SurveyRow[]) {
  const counts = new Map<string, number>();
  let answeredCount = 0;
  for (const r of rows) {
    const v = r.answers[q.id];
    const values = Array.isArray(v) ? v : v ? [v] : [];
    if (values.length === 0) continue;
    answeredCount++;
    for (const val of values) counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return { counts, answeredCount };
}

// showIf가 있는 문항은 특정 응답에 따라 일부 응답자에게만 노출되므로, 응답 인원이
// 전체 응답자 수보다 적게 나오는 게 정상이다 — 요약 화면에 그 이유를 바로 보여준다.
function ConditionalNote({ q, rows, answeredCount }: { q: SurveyQuestion; rows: SurveyRow[]; answeredCount: number }) {
  if (!q.showIf) return null;
  const eligible = rows.filter((r) => q.showIf!(r.answers)).length;
  return (
    <div style={{ fontSize: 11, color: '#ff9500', marginTop: -2, marginBottom: 8 }}>
      조건부 문항 — 전체 {rows.length}명 중 {eligible}명에게만 노출됨 (그중 {answeredCount}명 응답)
    </div>
  );
}

function SummaryQuestion({ q, rows }: { q: SurveyQuestion; rows: SurveyRow[] }) {
  if (q.type === 'text') {
    const answered = rows.filter((r) => typeof r.answers[q.id] === 'string' && (r.answers[q.id] as string).length > 0);
    return (
      <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#636366', flex: 1 }}>{q.title}</span>
          <span style={{ fontSize: 12, color: '#8e8e93', flexShrink: 0 }}>{answered.length}명 응답</span>
        </div>
        <ConditionalNote q={q} rows={rows} answeredCount={answered.length} />
        {answered.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {answered.map((r) => (
              <div key={r.id} style={{ fontSize: 12.5, color: '#1d1d1f', background: '#fafafa', borderRadius: 8, padding: '6px 10px', whiteSpace: 'pre-line' }}>
                “{r.answers[q.id] as string}”
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const { counts, answeredCount } = optionCounts(q, rows);
  const maxCount = Math.max(1, ...Array.from(counts.values()));
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: '#636366', flex: 1 }}>{q.title}</span>
        <span style={{ fontSize: 12, color: '#8e8e93', flexShrink: 0 }}>{answeredCount}명 응답</span>
      </div>
      <ConditionalNote q={q} rows={rows} answeredCount={answeredCount} />
      <div style={{ display: 'grid', gap: 7 }}>
        {(q.options ?? []).map((o) => {
          const c = counts.get(o.value) ?? 0;
          const pct = answeredCount > 0 ? Math.round((c / answeredCount) * 100) : 0;
          return (
            <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, color: '#1d1d1f', width: 190, flexShrink: 0, lineHeight: 1.4 }}>{o.label}</span>
              <div style={{ flex: 1, height: 16, background: '#f2f2f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(c / maxCount) * 100}%`, background: '#007AFF', borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 12, color: '#636366', width: 64, flexShrink: 0, textAlign: 'right', fontFamily: M }}>{c}명 ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 조건부 문항(showIf)들은 일반 목록 대신 여기서 실제 문항 내용(제목+응답 막대그래프)을
// 그대로 노드로 써서 마인드맵 형태로 연결해 보여준다. 가로로 길어지므로 좌우 스크롤.
// lib/survey-questions.ts의 showIf 로직을 손으로 그대로 옮긴 것이라, 문항 조건이
// 바뀌면 이 트리 구조도 같이 고쳐줘야 한다.
const BRANCH_QUESTION_IDS = new Set(['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B4', 'B5']);

function findQ(id: string): SurveyQuestion {
  const q = SURVEY_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question id: ${id}`);
  return q;
}

function TreeNode({ id, rows, width = 320 }: { id: string; rows: SurveyRow[]; width?: number }) {
  return (
    <div style={{ width, flexShrink: 0, background: '#fff', border: '1.5px solid #1d1d1f', borderRadius: 12, overflow: 'hidden' }}>
      <SummaryQuestion q={findQ(id)} rows={rows} />
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0', flexShrink: 0 }}>
      <div style={{ width: 1.5, height: 16, background: '#c7c7cc' }} />
      <div style={{ fontSize: 10.5, color: '#ff9500', background: '#fff8ec', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', fontWeight: 600, margin: '2px 0' }}>
        {label}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #c7c7cc' }} />
    </div>
  );
}

// 가로 방향(왼쪽 부모 → 오른쪽 자식)으로 흐르는 화살표. 세로 트리 사이를 가로로 이어줄 때 쓴다.
function FlowArrowRight({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 6px', flexShrink: 0 }}>
      <div style={{ fontSize: 10.5, color: '#ff9500', background: '#fff8ec', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 24, height: 1.5, background: '#c7c7cc' }} />
        <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '5px solid #c7c7cc' }} />
      </div>
    </div>
  );
}

function BranchDiagram({ rows }: { rows: SurveyRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: F }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>🔀 조건부 문항 마인드맵 (A2~A8, B4~B5)</span>
        <span style={{ fontSize: 12, color: '#8e8e93' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '4px 20px 24px', overflowX: 'auto' }}>
          {/* Tree A: A2 응답에 따라 A3~A8 중 무엇이 보일지 갈림. 위쪽 줄은 "안구마우스 등"
              선택 시 흐름(A7), 아래쪽 줄은 미선택 시 흐름(A3→A4/A5/A6)이며 둘 다 결국 A8로
              모인다 — A8은 아래쪽 줄 끝에 한 번만 그리고, 위쪽 줄에는 텍스트로만 연결을 표시. */}
          <div style={{ display: 'flex', alignItems: 'center', width: 'max-content', marginBottom: 32 }}>
            <TreeNode id="A2" rows={rows} width={340} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FlowArrowRight label="'안구마우스 등' 선택 시" />
                <TreeNode id="A7" rows={rows} width={300} />
                <div style={{ marginLeft: 14, maxWidth: 150, fontSize: 11, color: '#ff9500', lineHeight: 1.5 }}>
                  “전혀/거의/가끔 사용” 응답 시 → 아래쪽 A8로 연결
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FlowArrowRight label="선택 안 함" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <TreeNode id="A3" rows={rows} width={300} />
                  <FlowArrow label="'네' 응답 시" />
                  <div style={{ display: 'flex', gap: 16 }}>
                    <TreeNode id="A4" rows={rows} width={280} />
                    <TreeNode id="A5" rows={rows} width={300} />
                    <TreeNode id="A6" rows={rows} width={340} />
                  </div>
                </div>
                <FlowArrowRight label="A5 '네' 응답 시" />
                <TreeNode id="A8" rows={rows} width={360} />
              </div>
            </div>
          </div>

          {/* Tree B: B4 응답에 따라 B5가 보일지 갈림 */}
          <div style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}>
            <TreeNode id="B4" rows={rows} width={340} />
            <FlowArrowRight label="'매번'~'반반' 응답 시" />
            <TreeNode id="B5" rows={rows} width={340} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryView({ rows }: { rows: SurveyRow[] }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <BranchDiagram rows={rows} />
        {GROUPED_QUESTIONS.map((section) => (
          <div key={section.key} style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#007AFF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              [{section.key}] {section.label}
            </div>
            {section.groups.map((group, gi) => {
              // 조건부 문항(A2~A8, B4~B5)은 위쪽 마인드맵에서만 보여주고 일반 목록에서는 뺀다.
              const questions = group.questions.filter((q) => !BRANCH_QUESTION_IDS.has(q.id));
              if (questions.length === 0) return null;
              return (
                <div key={gi} style={{ marginBottom: 14 }}>
                  {group.label && <div style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 8 }}>{group.label}</div>}
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    {questions.map((q, qi) => (
                      <div key={q.id} style={{ marginTop: qi > 0 ? -1 : 0 }}>
                        <SummaryQuestion q={q} rows={rows} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 응답자가 행, 문항이 열인 표 형태로 전체 응답을 한 화면에서 훑어볼 수 있게 한다 —
// 엑셀 내보내기와 같은 데이터 구조를 화면에서 그대로 보여주는 버전.
function TableView({ rows }: { rows: SurveyRow[] }) {
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
            {SURVEY_QUESTIONS.map((q) => (
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
              {SURVEY_QUESTIONS.map((q) => (
                <td key={q.id} style={cellStyle}>{formatAnswerLabel(q, r.answers)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
  const [viewMode, setViewMode] = useState<'detail' | 'table' | 'summary'>('detail'); // PC: 목록+상세 / 전체 표 / 문항별 요약

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

  async function handleDelete(r: SurveyRow) {
    if (!confirm(`${r.caregiverName || '이름 없음'}님의 응답을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    await deleteDoc(doc(db, 'survey_responses', r.id));
    setRows((prev) => prev.filter((row) => row.id !== r.id));
    setSelectedId((id) => (id === r.id ? null : id));
    setExpandedId((id) => (id === r.id ? null : id));
  }

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
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
              {([
                ['summary', '요약보기'],
                ['detail', '상세보기'],
                ['table', '표로보기'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
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
      ) : viewMode === 'table' ? (
        // 응답자가 행, 문항이 열인 표로 전체 응답을 한 화면에서 훑어보는 모드.
        <TableView rows={filtered} />
      ) : viewMode === 'summary' ? (
        // 문항별 답변 분포를 막대그래프로 보여주는 요약 모드.
        <SummaryView rows={filtered} />
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
              <DetailPanel r={selectedRow} onDelete={handleDelete} />
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
