'use client';

import { getStageQuestions } from '@/lib/survey-stages';
import { formatAnswerLabel } from '@/lib/survey-questions';
import { relatedPreQuestions, trendFollowup } from '@/lib/survey-trends';
import { interviewText, type SurveyRow } from '@/lib/survey-records';

export default function SurveyParticipantTrend({ source, rows, example, onExampleChange }: { source: SurveyRow; rows: SurveyRow[]; example: boolean; onExampleChange: (value: boolean) => void }) {
  const mid = trendFollowup(rows, source.id, 'mid', example);
  const post = trendFollowup(rows, source.id, 'post', example);
  const questions = getStageQuestions('mid');
  return <div>
    <div role="group" aria-label="추이 자료 구분" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>{([false, true] as const).map((value) => <button key={String(value)} aria-pressed={example === value} onClick={() => onExampleChange(value)} style={{ minHeight: 44, border: '1px solid #c7c7cc', borderRadius: 9999, padding: '0 16px', background: example === value ? '#1d1d1f' : '#fff', color: example === value ? '#fff' : '#1d1d1f', cursor: 'pointer' }}>{value ? '내부 기록' : '확정 응답'}</button>)}</div>
    <h1 style={{ fontSize: 20, marginTop: 0 }}>{source.patientName || '환자명 없음'} · 개인별 답변 추이</h1>
    <p style={{ fontSize: 13, color: '#636366', lineHeight: 1.6 }}>보호자 {source.caregiverName || '—'} · 사전 원답변과 중간·사후에서 선택한 보기를 함께 확인합니다.</p>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, padding: '12px 0' }}>
      <span>사전: 기록 있음</span><span>중간: {mid ? mid.collectedOn || '기록 있음' : '미입력'}</span><span>사후: {post ? post.collectedOn || '기록 있음' : '미입력'}</span>
    </div>
    <p style={{ fontSize: 12, color: '#636366' }}>좁은 화면에서는 표를 좌우로 움직여 사전·중간·사후 답변을 확인할 수 있습니다.</p>
    <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #e5e5ea' }}>
      <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
        <thead><tr>{['문항', '사전 · 관련 원답변', '중간', '사후'].map((label) => <th key={label} style={{ padding: 14, background: '#f2f2f7', borderBottom: '1px solid #e5e5ea' }}>{label}</th>)}</tr></thead>
        <tbody>{questions.map((q) => {
          const related = relatedPreQuestions(q.id);
          return <tr key={q.id}>
            <th style={{ padding: 14, width: '24%', fontWeight: 500, borderBottom: '1px solid #e5e5ea', verticalAlign: 'top' }}>{q.id}. {q.title}</th>
            <td style={{ padding: 14, width: '24%', borderBottom: '1px solid #e5e5ea', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{related.length === 0 ? '대응 사전 문항 없음' : related.map((pre) => <div key={pre.id} style={{ marginBottom: 8 }}><small style={{ color: '#636366' }}>{pre.id}. {pre.title}</small><div>{formatAnswerLabel(pre, source.answers)}</div></div>)}</td>
            {[mid, post].map((record, i) => <td key={i} style={{ padding: 14, width: '20%', borderBottom: '1px solid #e5e5ea', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{record ? formatAnswerLabel(q, record.answers) : '미입력'}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    <h2 style={{ fontSize: 15, marginTop: 24 }}>인터뷰 원문·기록 메모</h2>
    {[mid, post].map((r, i) => <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}><strong>{i === 0 ? '중간' : '사후'}</strong><p style={{ marginBottom: 0 }}>{interviewText(r) || '기록 없음'}</p></div>)}
  </div>;
}
