'use client';

import { useEffect, useState } from 'react';
import { getStageQuestions, FOLLOWUP_SECTION_LABELS } from '@/lib/survey-stages';
import { SURVEY_QUESTIONS } from '@/lib/survey-questions';
import { surveyDistribution } from '@/lib/survey-distribution';
import { COMMON_PRE, relatedPreQuestions, trendFollowup } from '@/lib/survey-trends';
import type { SharedSurveyRow } from '@/lib/survey-share';
import type { SurveyQuestion } from '@/lib/survey-questions';
import styles from './share.module.css';

const questions = getStageQuestions('mid');
const preChoiceQuestions = SURVEY_QUESTIONS.filter((question) => question.options?.length);

function response(row: SharedSurveyRow | undefined, question: SurveyQuestion) {
  const answer = row?.answers?.[question.id];
  return typeof answer === 'string' && question.options?.some((option) => option.value === answer) ? answer : null;
}

function preAnswer(row: SharedSurveyRow, question: SurveyQuestion) {
  const answer = row.answers?.[question.id];
  const values = Array.isArray(answer) ? answer : [answer];
  return values.map((value) => question.options?.find((option) => option.value === value)?.label).filter(Boolean).join(' · ') || '응답 없음';
}

function choiceAnswer(value: string | null, question: SurveyQuestion) {
  return value === null ? '응답 없음' : question.options?.find((option) => option.value === value)?.label ?? '응답 없음';
}

function stageRows(rows: SharedSurveyRow[], sourceId: string) {
  const mid = trendFollowup(rows, sourceId, 'mid') ?? trendFollowup(rows, sourceId, 'mid', true);
  const post = trendFollowup(rows, sourceId, 'post') ?? trendFollowup(rows, sourceId, 'post', true);
  return { mid, post };
}

function DistributionCard({ stage, question, rows }: { stage: string; question: SurveyQuestion; rows: SharedSurveyRow[] }) {
  const distribution = surveyDistribution(question, rows);
  return <article className={styles.ratioCard}>
    <div className={styles.ratioHeading}>
      <span>{stage} · {question.id}</span>
      <h3>{question.title}</h3>
      <p>응답 {distribution.answered}명 / 대상 {distribution.total}명</p>
    </div>
    {distribution.answered === 0 ? <p className={styles.noAnswers}>응답이 없습니다.</p> : null}
    <div className={styles.ratioOptions}>{distribution.options.map((option) => <div className={styles.ratioOption} key={option.value}>
      <div className={styles.ratioOptionLabel}><span>{option.label}</span><strong>{option.count}명 · {option.percent}%</strong></div>
      <div className={styles.ratioTrack} aria-hidden="true"><span style={{ width: `${option.percent}%` }} /></div>
    </div>)}</div>
    {distribution.multiple ? <p className={styles.ratioNote}>복수 선택 문항이라 비율의 합이 100%를 넘을 수 있습니다.</p> : null}
  </article>;
}

export default function AnonymousTrendsPage() {
  const [rows, setRows] = useState<SharedSurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<'person' | 'question'>('person');
  const [questionGroup, setQuestionGroup] = useState<'followup' | 'pre'>('followup');
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    fetch('/api/survey-share', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('공유 데이터를 불러오지 못했습니다.');
        return response.json();
      })
      .then((data: { rows: SharedSurveyRow[] }) => setRows(data.rows))
      .catch(() => setError('응답을 불러오지 못했습니다. 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  const people = rows.filter((row) => row.surveyType === 'pre').sort((a, b) => a.id.localeCompare(b.id));
  const person = people[selected];
  const { mid, post } = person ? stageRows(rows, person.id) : { mid: undefined, post: undefined };
  const questionList = questionGroup === 'followup' ? questions : preChoiceQuestions;
  const selectedQuestion = questionList[questionIndex] ?? questionList[0];
  const midRows = people.map((entry) => stageRows(rows, entry.id).mid).filter((row): row is SharedSurveyRow => !!row);
  const postRows = people.map((entry) => stageRows(rows, entry.id).post).filter((row): row is SharedSurveyRow => !!row);
  const includesInternalEntries = rows.some((row) => row.surveyType !== 'pre' && row.recordStatus === 'example');

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><h1>사전 · 중간 · 사후 설문 변화</h1><p>익명 참여자별 선택지와 문항별 응답 비율을 공유합니다.</p>{includesInternalEntries ? <p>중간·사후에는 내부 검토용 입력값이 포함되어 있습니다.</p> : null}</div>
      <span className={styles.count}>{people.length}명</span>
    </header>
    {!loading && !error && person ? <div className={styles.viewTabs} role="group" aria-label="설문 결과 보기">
      <button aria-pressed={view === 'person'} onClick={() => setView('person')}>개인별 답변</button>
      <button aria-pressed={view === 'question'} onClick={() => setView('question')}>문항별 비율</button>
    </div> : null}
    {loading ? <p className={styles.message}>응답을 불러오는 중입니다.</p> : error ? <p className={styles.message} role="alert">{error}</p> : !person ? <p className={styles.message}>사전 응답이 없습니다.</p> : view === 'person' ?
      <div className={styles.layout}>
        <nav className={styles.people} aria-label="익명 참여자 선택">
          <h2>참여자</h2>
          <div className={styles.peopleList}>{people.map((entry, index) => <button key={entry.id} className={`${styles.person} ${selected === index ? styles.active : ''}`} aria-current={selected === index ? 'true' : undefined} onClick={() => setSelected(index)}>
            <span>참여자 {String(index + 1).padStart(2, '0')}</span>
          </button>)}</div>
        </nav>
        <div className={styles.content}>
          <div className={styles.overview}>
            <div><span className={styles.eyebrow}>참여자 {String(selected + 1).padStart(2, '0')}</span><h2>사전 → 중간 → 사후</h2><p>각 시점에 선택한 답변을 문장 그대로 따라갑니다. 질문 문구가 다른 항목은 관련 답변으로 연결합니다.</p></div>
          </div>
          <section className={styles.common} aria-label="사전·중간·사후 공통 주제 추이">
            <h3>세 번 공통으로 살펴본 주제</h3>
            <p>세 시점에서 고른 선택지 문장을 그대로 보여줍니다. 질문 표현이 달라 답변 내용을 함께 살펴봐야 합니다.</p>
            <div className={styles.commonGrid}>{COMMON_PRE.map(({ id, label }) => {
              const question = questions.find((item) => item.id === id)!;
              const preQuestion = relatedPreQuestions(id)[0];
              const midValue = response(mid, question);
              const postValue = response(post, question);
              return <article className={styles.commonCard} key={id}>
                <h4>{label} <small>{id}</small></h4>
                <div className={styles.commonPath}>
                  <span><small>사전</small><strong>{preQuestion ? preAnswer(person, preQuestion) : '응답 없음'}</strong></span><b aria-hidden="true">↓</b>
                  <span><small>중간</small><strong>{choiceAnswer(midValue, question)}</strong></span><b aria-hidden="true">↓</b>
                  <span><small>사후</small><strong>{choiceAnswer(postValue, question)}</strong></span>
                </div>
              </article>;
            })}</div>
          </section>
          {[...new Set(questions.map((question) => question.section))].map((section) => <section className={styles.section} key={section}>
            <h3><span>{section}</span> {FOLLOWUP_SECTION_LABELS[section]}</h3>
            {questions.filter((question) => question.section === section).map((question) => {
              const before = relatedPreQuestions(question.id);
              const midValue = response(mid, question);
              const postValue = response(post, question);
              return <article className={styles.card} key={question.id}>
                <div className={styles.question}><span className={styles.questionId}>{question.id}</span><h4>{question.title}</h4></div>
                <div className={styles.answers}>
                  <div className={styles.pre}><span className={styles.stage}>① 사전 · 관련 문항</span>{before.length ? before.map((source) => <p key={source.id}><b>{source.id}</b> {source.title}<em>{preAnswer(person, source)}</em></p>) : <p>연결할 사전 문항 없음</p>}</div>
                  <div className={styles.arrow}><span aria-hidden="true">→</span></div>
                  <div className={styles.stageAnswer}><span className={styles.stage}>② 중간</span><strong>{choiceAnswer(midValue, question)}</strong></div>
                  <div className={styles.arrow}><span aria-hidden="true">→</span></div>
                  <div className={styles.stageAnswer}><span className={styles.stage}>③ 사후</span><strong>{choiceAnswer(postValue, question)}</strong></div>
                </div>
              </article>;
            })}
          </section>)}
        </div>
      </div> : <div className={styles.questionView}>
        <div className={styles.questionGroups} role="group" aria-label="문항 범위">
          <button aria-pressed={questionGroup === 'followup'} onClick={() => { setQuestionGroup('followup'); setQuestionIndex(0); }}>중간·사후 20문항</button>
          <button aria-pressed={questionGroup === 'pre'} onClick={() => { setQuestionGroup('pre'); setQuestionIndex(0); }}>사전 객관식 {preChoiceQuestions.length}문항</button>
        </div>
        <div className={styles.layout}>
          <nav className={styles.people} aria-label="비율을 볼 문항 선택">
            <h2>문항</h2>
            <div className={styles.peopleList}>{questionList.map((question, index) => <button key={question.id} className={`${styles.person} ${questionIndex === index ? styles.active : ''}`} aria-current={questionIndex === index ? 'true' : undefined} onClick={() => setQuestionIndex(index)}>
              <span>{question.id}</span><small>{question.title}</small>
            </button>)}</div>
          </nav>
          <div className={styles.content}>
            <div className={styles.ratioIntro}><span>{questionGroup === 'followup' ? '중간·사후 문항' : '사전 문항'} · {selectedQuestion.id}</span><h2>{selectedQuestion.title}</h2><p>각 비율은 해당 문항에 답한 사람을 기준으로 계산합니다. 사전 서술형 1문항은 선택지 비율 대상에서 제외했습니다.</p></div>
            {questionGroup === 'followup' ? <>
              {relatedPreQuestions(selectedQuestion.id).length ? <section className={styles.ratioSection}><h3>사전 관련 문항</h3>{relatedPreQuestions(selectedQuestion.id).map((question) => <DistributionCard key={question.id} stage="사전" question={question} rows={people} />)}</section> : <p className={styles.noRelated}>직접 연결되는 사전 문항은 없습니다.</p>}
              <section className={styles.ratioSection}><h3>중간 · 사후</h3><div className={styles.ratioGrid}>
                <DistributionCard stage="중간" question={selectedQuestion} rows={midRows} />
                <DistributionCard stage="사후" question={getStageQuestions('post').find((question) => question.id === selectedQuestion.id)!} rows={postRows} />
              </div></section>
            </> : <section className={styles.ratioSection}><h3>사전</h3><DistributionCard stage="사전" question={selectedQuestion} rows={people} /></section>}
          </div>
        </div>
      </div>}
  </main>;
}
