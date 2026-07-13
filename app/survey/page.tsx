'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SURVEY_QUESTIONS, SurveyAnswers, SurveyQuestion, isQuestionAnswered } from '@/lib/survey-questions';

// 문항이 새 주제로 넘어가는 첫 지점에만 회상을 유도하는 문구를 보여준다 —
// 같은 안내가 문항마다 반복되지 않게, "이 섹션의 첫 문항 id"에만 매칭시킨다.
const SECTION_INTROS: Record<string, { heading: string; description: string }> = {
  A1: {
    heading: '기존 의사소통 방식 및 돌봄 상황',
    description: '환자분과 함께한 최근의 일상을 천천히 떠올려보며 답해주세요.',
  },
  B1: {
    heading: '의사소통의 명확성',
    description: '환자분과 나눈 대화의 순간들을 하나씩 떠올려보세요.',
  },
  B6: {
    heading: '의사소통 주제의 다양성',
    description: '여러 상황에서 나눈 대화들을 생각해보세요.',
  },
  B8: {
    heading: '의사소통의 적시성',
    description: '환자분이 도움이 필요했던 순간들을 떠올려보세요.',
  },
  B13: {
    heading: '일상제어 및 자기결정권',
    description: '환자분이 스스로 무언가를 선택했던 순간을 생각해보세요.',
  },
  B17: {
    heading: '환자분과의 관계',
    description: '마지막으로, 환자분과의 관계에 대해 여쭤보겠습니다.',
  },
  C1: {
    heading: '니즈 및 기대사항',
    description: '지금까지의 답변을 떠올리며, 모스픽을 통해 기대하시는 부분을 천천히 생각해보세요.',
  },
};

interface Identity {
  patientName: string;
  caregiverName: string;
  caregiverContact: string;
}

const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

const font = '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif';
const dark = '#1C1C1E';
const green = '#3A3A3C';
const lbl = '#000';
const lbl2 = 'rgba(60,60,67,0.6)';
const sep = 'rgba(60,60,67,0.18)';
const bg = '#F2F2F7';

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: lbl2, fontWeight: 600 }}>{current} / {total}</span>
        <span style={{ fontSize: 12, color: lbl2 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(60,60,67,0.12)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: green, borderRadius: 2, transition: 'width 0.2s' }} />
      </div>
    </div>
  );
}

function Layout({ children, footer, onBack, progress }: { children: React.ReactNode; footer: React.ReactNode; onBack?: () => void; progress?: { current: number; total: number } }) {
  return (
    <div style={{ minHeight: '100svh', background: bg, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: onBack ? '20px 20px 0' : '52px 20px 0', maxWidth: 560, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {progress && <ProgressBar current={progress.current} total={progress.total} />}
        {children}
      </div>
      <div style={{ position: 'sticky', bottom: 0, background: bg, padding: '16px 20px 32px', maxWidth: 560, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {footer}
      </div>
    </div>
  );
}

function Check({ checked, shape = 'circle', rank }: { checked: boolean; shape?: 'circle' | 'square'; rank?: number }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: shape === 'circle' ? '50%' : 8,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: checked ? green : 'rgba(60,60,67,0.1)',
        border: checked ? 'none' : `1.5px solid ${sep}`,
        transition: 'background 0.15s',
      }}
    >
      {checked && rank ? (
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: font }}>{rank}</span>
      ) : checked ? (
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

function OtherInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      placeholder="직접 입력해주세요"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        border: `1px solid ${sep}`,
        borderRadius: 10,
        outline: 'none',
        fontSize: 15,
        color: lbl,
        padding: '10px 12px',
        background: '#fff',
        fontFamily: font,
        boxSizing: 'border-box',
        marginTop: 8,
      }}
    />
  );
}

function QuestionBlock({
  q,
  answers,
  onSingle,
  onToggleMulti,
  onToggleRanked,
  onText,
  onOtherText,
}: {
  q: SurveyQuestion;
  answers: SurveyAnswers;
  onSingle: (id: string, value: string) => void;
  onToggleMulti: (id: string, value: string) => void;
  onToggleRanked: (id: string, value: string, max: number) => void;
  onText: (id: string, value: string) => void;
  onOtherText: (id: string, value: string) => void;
}) {
  const value = answers[q.id];
  const otherText = (answers[`${q.id}_other`] as string) ?? '';

  return (
    <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 16, padding: '20px 18px' }}>
      {/* q.helperNote는 분기 조건 설명용 내부 메모라 응답자에게는 보여주지 않는다 — 조건에 안 맞으면 문항 자체가 노출되지 않는다 */}
      <p style={{ fontSize: 18, fontWeight: 600, color: lbl, lineHeight: 1.5, marginBottom: 16 }}>{q.title}</p>

      {q.type === 'text' && (
        <input
          placeholder={q.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => onText(q.id, e.target.value)}
          style={{
            width: '100%',
            border: `1px solid ${sep}`,
            borderRadius: 10,
            outline: 'none',
            fontSize: 15,
            color: lbl,
            padding: '12px 14px',
            background: '#fff',
            fontFamily: font,
            boxSizing: 'border-box',
          }}
        />
      )}

      {q.type !== 'text' &&
        q.options?.map((opt) => {
          const isRanked = q.type === 'multiRanked';
          const arr = Array.isArray(value) ? (value as string[]) : [];
          const selected = q.type === 'single' ? value === opt.value : arr.includes(opt.value);
          const rank = isRanked && selected ? arr.indexOf(opt.value) + 1 : undefined;
          const disabled = isRanked && !selected && arr.length >= (q.maxSelect ?? 2);

          return (
            <div key={opt.value} style={{ marginBottom: 8 }}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (q.type === 'single') onSingle(q.id, opt.value);
                  else if (q.type === 'multi') onToggleMulti(q.id, opt.value);
                  else onToggleRanked(q.id, opt.value, q.maxSelect ?? 2);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: selected ? 'rgba(58,58,60,0.06)' : '#fff',
                  border: `1px solid ${selected ? green : sep}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  fontFamily: font,
                  textAlign: 'left',
                }}
              >
                <Check checked={selected} shape={q.type === 'single' ? 'circle' : 'square'} rank={rank} />
                <span style={{ fontSize: 15.5, color: lbl, lineHeight: 1.4 }}>{opt.label}</span>
              </button>
              {opt.isOther && selected && <OtherInput value={otherText} onChange={(v) => onOtherText(q.id, v)} />}
            </div>
          );
        })}
    </div>
  );
}

export default function PreSurveyPage() {
  const [step, setStep] = useState('intro');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentExpanded, setConsentExpanded] = useState(false);
  const [identity, setIdentity] = useState<Identity>({ patientName: '', caregiverName: '', caregiverContact: '' });
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 문항 하나 = 화면 하나. 여러 문항을 한 화면에 몰아서 보여주면 훑어보며 답을 빠르게
  // 찍는 경향(straightlining)이 생기기 쉬워서, 현재 답변 기준으로 조건분기까지 반영한
  // "지금 보여줘야 할 문항" 순서를 매번 계산하고 그 흐름을 그대로 단계로 사용한다.
  const visibleQuestions = useMemo(
    () => SURVEY_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers]
  );
  const FLOW = useMemo(() => ['intro', 'consent', 'identity', ...visibleQuestions.map((q) => q.id)], [visibleQuestions]);
  const flowIndex = FLOW.indexOf(step);
  const currentQuestion = visibleQuestions.find((q) => q.id === step) ?? null;
  const isLastQuestion = !!currentQuestion && flowIndex === FLOW.length - 1;

  const goPrev = () => { if (flowIndex > 0) setStep(FLOW[flowIndex - 1]); };
  const goNext = () => { if (flowIndex >= 0 && flowIndex < FLOW.length - 1) setStep(FLOW[flowIndex + 1]); };

  // progress는 intro를 뺀 나머지(동의 → 응답자정보 → 문항들) 기준으로 표시한다.
  const PROGRESS_FLOW = FLOW.slice(1);
  const progressIndex = PROGRESS_FLOW.indexOf(step);
  const progress = progressIndex >= 0 ? { current: progressIndex + 1, total: PROGRESS_FLOW.length } : undefined;

  // 화면(문항)이 바뀌면 스크롤을 맨 위로 — 실제로 스크롤되는 건 이 페이지의 내부 div가
  // 아니라 창(window) 쪽이라(레이아웃이 min-height라 내부 div는 늘어날 뿐 넘치지 않음).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const setSingle = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const setText = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));
  const setOtherText = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [`${id}_other`]: value }));
  const toggleMulti = (id: string, value: string) =>
    setAnswers((prev) => {
      const arr = Array.isArray(prev[id]) ? [...(prev[id] as string[])] : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(value);
      return { ...prev, [id]: arr };
    });
  const toggleRanked = (id: string, value: string, max: number) =>
    setAnswers((prev) => {
      const arr = Array.isArray(prev[id]) ? [...(prev[id] as string[])] : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1);
      else {
        if (arr.length >= max) return prev;
        arr.push(value);
      }
      return { ...prev, [id]: arr };
    });

  const primaryBtn = (disabled?: boolean): React.CSSProperties => ({
    padding: '16px', borderRadius: 980, border: 'none',
    background: disabled ? 'rgba(60,60,67,0.12)' : dark,
    color: disabled ? lbl2 : '#fff', fontSize: 17, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: font,
  });
  const prevBtn: React.CSSProperties = {
    padding: '16px 20px', borderRadius: 980, border: `1.5px solid ${sep}`,
    background: '#fff', color: lbl2, fontSize: 17, fontWeight: 500, cursor: 'pointer', fontFamily: font,
  };

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const deviceType = /Mobi|Android/i.test(navigator.userAgent)
        ? 'mobile'
        : /Tablet|iPad/i.test(navigator.userAgent)
        ? 'tablet'
        : 'desktop';
      await addDoc(collection(db, 'survey_responses'), {
        surveyType: 'pre',
        surveyVersion: 'v1',
        patientName: identity.patientName || null,
        caregiverName: identity.caregiverName || null,
        caregiverContact: identity.caregiverContact || null,
        answers,
        deviceType,
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
      });
      setStep('complete');
    } catch (e) {
      console.error(e);
      setSubmitError('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── INTRO ─────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: lbl, letterSpacing: '-0.5px', marginBottom: 16 }}>모스픽 사전 설문</h1>
          <p style={{ fontSize: 17, fontWeight: 400, color: lbl, lineHeight: 1.75 }}>
            모스픽 사용 전, 환자분과의 기존 의사소통 방식과 현재 돌봄 상황을 여쭤보는 설문입니다.
          </p>
          <p style={{ fontSize: 14, color: lbl2, marginTop: 12 }}>약 5~7분 소요, 보호자분이 응답해 주세요.</p>
          <p style={{ fontSize: 14, color: lbl2, marginTop: 12, lineHeight: 1.6 }}>
            보호자분의 답변은 모스픽을 개선하고 더 나은 방향으로 나아가기 위한 연구에 직접 반영됩니다.
          </p>
        </div>
        <div style={{ padding: '16px 28px 36px', maxWidth: 520, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <button style={{ ...primaryBtn(), width: '100%' }} onClick={goNext}>시작하기</button>
        </div>
      </div>
    );
  }

  // ── CONSENT ───────────────────────────────────────────────────
  if (step === 'consent') {
    return (
      <Layout
        onBack={goPrev}
        progress={progress}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={goPrev} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button style={{ ...primaryBtn(!consentChecked), flex: 1 }} disabled={!consentChecked} onClick={goNext}>동의하고 계속하기</button>
          </div>
        }
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>동의 및 개인정보</h1>
        <p style={{ fontSize: 15, color: lbl2, marginBottom: 20 }}>설문 참여를 위해 아래 내용을 확인해주세요.</p>

        <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 14, overflow: 'hidden' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setConsentChecked((c) => !c)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: lbl }}>설문 응답 수집·이용 동의</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#FF3B30', background: 'rgba(255,59,48,0.1)', padding: '2px 7px', borderRadius: 20 }}>필수</span>
              <button
                onClick={(e) => { e.stopPropagation(); setConsentExpanded((v) => !v); }}
                style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.45)', background: 'rgba(60,60,67,0.07)', padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: font }}
              >
                {consentExpanded ? '접기' : '전체 보기'}
              </button>
            </div>
            <Check checked={consentChecked} />
          </div>
          <div style={{ borderTop: `1px solid ${sep}` }}>
            {[
              ['수집 항목', '보호자 연락처(필수), 이름, 환자분 이름, 설문 응답 내용'],
              ['수집 목적', '모스픽 도입 전·중·후 변화 비교 분석'],
              ['보유 기간', '연구·분석 완료 후 1년, 이후 즉시 파기'],
              ['제3자 제공', '없음'],
            ].map(([l, v], i) => (
              <div key={l} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderTop: i > 0 ? `1px solid ${sep}` : 'none', background: 'rgba(60,60,67,0.02)' }}>
                <span style={{ fontSize: 13, color: lbl2, minWidth: 64, flexShrink: 0 }}>{l}</span>
                <span style={{ fontSize: 13, color: lbl, lineHeight: 1.5 }}>{v}</span>
              </div>
            ))}
          </div>
          {consentExpanded && (
            <div style={{ borderTop: `1px solid ${sep}`, padding: '14px 16px', background: 'rgba(60,60,67,0.02)' }}>
              <p style={{ fontSize: 13, color: lbl2, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                {`모스픽은 도입 전·중·후 시점의 변화를 비교하기 위해 같은 보호자분께 설문을 여러 차례 요청드릴 수 있습니다. 이를 위해 보호자 연락처를 응답 매칭 목적으로 수집합니다.\n\n수집된 정보는 연구·분석 완료 후 1년간 보관되며, 보유 기간 만료 시 즉시 파기됩니다. 제3자 제공 및 처리 위탁은 없습니다.\n\n동의하지 않으실 경우 설문 참여가 어렵습니다. 문의는 hello@morspeak.com으로 연락해주세요.`}
              </p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── IDENTITY ──────────────────────────────────────────────────
  if (step === 'identity') {
    const identityValid = identity.caregiverContact.length === 13;
    return (
      <Layout
        onBack={goPrev}
        progress={progress}
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={goPrev} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button style={{ ...primaryBtn(!identityValid), flex: 1 }} disabled={!identityValid} onClick={goNext}>다음</button>
          </div>
        }
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>응답자 정보</h1>
        <p style={{ fontSize: 15, color: lbl2, marginBottom: 20 }}>이후 설문과 답변을 매칭하기 위해 연락처가 필요합니다.</p>

        <div style={{ background: '#fff', border: `1px solid ${sep}`, borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>보호자 연락처</label>
            <input
              type="tel" placeholder="010-0000-0000" value={identity.caregiverContact} maxLength={13}
              onChange={(e) => setIdentity((f) => ({ ...f, caregiverContact: formatPhone(e.target.value) }))}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }}
            />
          </div>
          <div style={{ height: 1, background: sep, margin: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>보호자 이름</label>
            <input
              type="text" placeholder="선택 입력" value={identity.caregiverName}
              onChange={(e) => setIdentity((f) => ({ ...f, caregiverName: e.target.value }))}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }}
            />
          </div>
          <div style={{ height: 1, background: sep, margin: '0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <label style={{ fontSize: 15, color: lbl2, width: 96, flexShrink: 0 }}>환자분 이름</label>
            <input
              type="text" placeholder="선택 입력" value={identity.patientName}
              onChange={(e) => setIdentity((f) => ({ ...f, patientName: e.target.value }))}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: lbl, padding: '15px 0', background: 'transparent', fontFamily: font }}
            />
          </div>
        </div>
      </Layout>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────
  if (step === 'complete') {
    return (
      <div style={{ minHeight: '100svh', background: '#fff', fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '64px 28px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <svg width="32" height="25" viewBox="0 0 32 25" fill="none">
              <path d="M2 12.5l10 10L30 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 12 }}>설문 완료</h1>
          <p style={{ fontSize: 17, color: lbl2, lineHeight: 1.7 }}>
            소중한 시간 내어 응답해 주셔서 감사합니다.<br /><br />
            보내주신 답변은 모스픽을 개선하고 더 나은 방향으로 나아가기 위한 연구에 큰 도움이 됩니다.<br /><br />
            모스픽 팀이 답변을 확인하고 다음 단계를 안내드리겠습니다.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.35)', marginTop: 20 }}>창을 닫으셔도 됩니다.</p>
        </div>
      </div>
    );
  }

  // ── QUESTION (한 화면에 문항 하나) ────────────────────────────────
  if (!currentQuestion) return null;
  const intro = SECTION_INTROS[currentQuestion.id];
  const answered = isQuestionAnswered(currentQuestion, answers);

  return (
    <Layout
      onBack={goPrev}
      progress={progress}
      footer={
        <div>
          {submitError && <p style={{ fontSize: 13, color: '#FF3B30', marginBottom: 8 }}>{submitError}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={goPrev} style={{ ...prevBtn, flexShrink: 0 }}>이전</button>
            <button
              style={{ ...primaryBtn(!answered || submitting), flex: 1 }}
              disabled={!answered || submitting}
              onClick={isLastQuestion ? handleSubmit : goNext}
            >
              {isLastQuestion ? (submitting ? '제출 중...' : '제출하기') : '다음'}
            </button>
          </div>
        </div>
      }
    >
      {intro && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: lbl, letterSpacing: '-0.4px', marginBottom: 6 }}>{intro.heading}</h1>
          <p style={{ fontSize: 14.5, color: lbl2, lineHeight: 1.6 }}>{intro.description}</p>
        </div>
      )}

      <QuestionBlock
        key={currentQuestion.id}
        q={currentQuestion}
        answers={answers}
        onSingle={setSingle}
        onToggleMulti={toggleMulti}
        onToggleRanked={toggleRanked}
        onText={setText}
        onOtherText={setOtherText}
      />
    </Layout>
  );
}
