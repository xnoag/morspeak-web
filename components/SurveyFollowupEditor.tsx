'use client';

import { useEffect, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStageQuestions, SURVEY_STAGES } from '@/lib/survey-stages';
import { formatAnswerLabel, SURVEY_QUESTIONS, type SurveyAnswers } from '@/lib/survey-questions';
import { followupId, followupPayload, positiveExample, type SurveyRow } from '@/lib/survey-records';

type Stage = 'mid' | 'post';
const field = { width: '100%', font: 'inherit', fontSize: 14, padding: 12, minHeight: 44, border: '1px solid #c7c7cc', borderRadius: 8, background: '#fff', color: '#1d1d1f' };
const button = { minHeight: 44, padding: '0 16px', border: '1px solid #c7c7cc', borderRadius: 9999, background: '#fff', color: '#1d1d1f', cursor: 'pointer', font: 'inherit', fontSize: 13 };

export default function SurveyFollowupEditor({ source, stage, record, example, onSaved, onDirtyChange }: {
  source: SurveyRow; stage: Stage; record?: SurveyRow; example: boolean; onSaved: (row: SurveyRow) => void; onDirtyChange?: (dirty: boolean) => void;
}) {
  const [answers, setAnswers] = useState<SurveyAnswers>(record?.answers ?? (example ? positiveExample(stage) : {}));
  const [date, setDate] = useState(record?.collectedOn ?? '');
  const [notes, setNotes] = useState(record?.interviewNotes ?? (example ? '가상 예시: 요청을 더 명확하게 전달하고, 가족과 일상 대화를 나누는 순간이 늘었습니다. 실제 인터뷰 인용이 아닙니다.' : ''));
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(record?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const questions = getStageQuestions(stage);
  function changed() { setConfirmed(false); setDirty(true); onDirtyChange?.(true); }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save(final: boolean) {
    setMessage('');
    if (final && !confirmed) { setMessage('수기 원답변 대조 확인이 필요합니다.'); return; }
    setSaving(true);
    try {
      const status = example ? 'example' : final ? 'recorded' : 'draft';
      const payload = followupPayload(source, stage, answers, date, notes, status);
      const id = followupId(source.id, stage, example);
      const ref = doc(db, 'survey_responses', id);
      await runTransaction(db, async (transaction) => {
        const sourceSnapshot = await transaction.get(doc(db, 'survey_responses', source.id));
        const snapshot = await transaction.get(ref);
        if (!sourceSnapshot.exists() || sourceSnapshot.data().surveyType !== 'pre') throw new Error('사전 원응답을 확인할 수 없습니다. 새로고침해 주세요.');
        const previous = snapshot.data();
        if ((previous?.revision ?? 0) !== revision) throw new Error('다른 곳에서 수정한 기록이 있습니다. 새로고침한 뒤 다시 확인해 주세요.');
        if (previous && (previous.sourceResponseId !== source.id || previous.surveyVersion !== payload.surveyVersion)) throw new Error('기존 기록의 참여자 또는 문항 버전이 다릅니다. 기존 기록은 보존했습니다.');
        const history = previous?.revisionHistory ?? [];
        if (previous) {
          const { revisionHistory: _history, ...prior } = previous;
          void _history;
          history.push(prior);
        }
        transaction.set(ref, { ...payload, revision: revision + 1, revisionHistory: history, createdAt: previous?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() });
      });
      setRevision(revision + 1);
      setDirty(false); onDirtyChange?.(false);
      onSaved({ ...record, ...payload, id, revision: revision + 1 });
      setMessage(example ? '가상 초안을 저장했습니다. 실제 응답 집계에서 제외됩니다.' : final ? '원답변 확인 기록을 저장했습니다.' : '미완성 기록을 저장했습니다. 실제 응답 집계에서 제외됩니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다. 입력한 내용은 화면에 남아 있습니다.');
    } finally { setSaving(false); }
  }

  return <div style={{ maxWidth: 900 }}>
    <h2 style={{ fontSize: 18, marginTop: 0 }}>{source.patientName || '환자명 없음'} · {SURVEY_STAGES[stage]} {example ? '가상 초안' : '수기 입력'}</h2>
    <p style={{ fontSize: 13, color: '#636366', lineHeight: 1.6 }}>{example ? '긍정적 변화 시나리오를 보여주는 가상 답변입니다. 수정·저장해도 실제 성과에 포함되지 않습니다.' : '종이 설문과 인터뷰의 원답변을 옮겨 주세요. 미완성 저장은 집계에서 제외됩니다.'}</p>
    <details style={{ marginBottom: 20 }}><summary style={{ minHeight: 44, cursor: 'pointer' }}>사전 원답변 확인</summary>
      <p style={{ fontSize: 12 }}>사전은 6/29 문항, 이번 입력은 6/24 문항입니다. 점수를 자동 환산하지 않습니다.</p>
      {SURVEY_QUESTIONS.map((q) => <p key={q.id} style={{ fontSize: 13 }}>{q.id}. {q.title}<br /><strong>{formatAnswerLabel(q, source.answers)}</strong></p>)}
    </details>
    <label style={{ display: 'block', marginBottom: 20, fontSize: 13 }}>수기로 받은 조사일<input type="date" value={date} onChange={(e) => { setDate(e.target.value); changed(); }} style={{ ...field, marginTop: 8 }} /></label>
    {questions.map((q) => <fieldset key={q.id} style={{ margin: '0 0 16px', border: '1px solid #e5e5ea', borderRadius: 12, padding: 16, background: '#fff' }}>
      <legend style={{ fontSize: 13, fontWeight: 600, padding: '0 4px' }}>{q.id}. {q.title}</legend>
      <select aria-label={`${q.id} 답변`} value={(answers[q.id] as string) ?? ''} onChange={(e) => { setAnswers({ ...answers, [q.id]: e.target.value }); changed(); }} style={field}>
        <option value="">원답변 선택</option>{q.options?.map((o) => <option key={o.value} value={o.value}>{o.value}점 · {o.label}</option>)}
      </select>
      <textarea aria-label={`${q.id} 원답변 메모`} placeholder="추가 의견 원문 (선택)" value={(answers[`${q.id}_comment`] as string) ?? ''} onChange={(e) => { setAnswers({ ...answers, [`${q.id}_comment`]: e.target.value }); changed(); }} rows={2} style={{ ...field, marginTop: 8, resize: 'vertical' }} />
    </fieldset>)}
    <label style={{ display: 'block', fontSize: 13 }}>인터뷰 원문·기록 메모 (선택)
      <textarea value={notes} onChange={(e) => { setNotes(e.target.value); changed(); }} rows={5} style={{ ...field, marginTop: 8, resize: 'vertical' }} />
    </label>
    {!example && <label style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 44, marginTop: 16, fontSize: 13 }}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />수기 원자료와 답변·조사일·인터뷰 원문을 대조했습니다.</label>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
      <button disabled={saving} onClick={() => save(false)} style={button}>{saving ? '저장 중…' : example ? '가상 초안 저장' : '미완성 저장'}</button>
      {!example && <button disabled={saving} onClick={() => save(true)} style={{ ...button, background: '#1d1d1f', color: '#fff' }}>실제 응답 확정</button>}
    </div>
    {message && <p role="status" style={{ fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
  </div>;
}
