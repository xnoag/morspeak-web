'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStageQuestions, FOLLOWUP_SECTION_LABELS } from '@/lib/survey-stages';
import { relatedPreQuestions, scoreChange, trendFollowup } from '@/lib/survey-trends';
import type { SurveyRow } from '@/lib/survey-records';
import type { SurveyQuestion } from '@/lib/survey-questions';
import styles from './trends.module.css';

const questions = getStageQuestions('mid');

function response(row: SurveyRow | undefined, question: SurveyQuestion) {
  const answer = row?.answers?.[question.id];
  return typeof answer === 'string' && question.options?.some((option) => option.value === answer) ? answer : null;
}

function preAnswer(row: SurveyRow, question: SurveyQuestion) {
  const answer = row.answers?.[question.id];
  const values = Array.isArray(answer) ? answer : [answer];
  return values.map((value) => question.options?.find((option) => option.value === value)?.label).filter(Boolean).join(' · ') || '응답 없음';
}

function stageRows(rows: SurveyRow[], sourceId: string) {
  const mid = trendFollowup(rows, sourceId, 'mid') ?? trendFollowup(rows, sourceId, 'mid', true);
  const post = trendFollowup(rows, sourceId, 'post') ?? trendFollowup(rows, sourceId, 'post', true);
  return { mid, post };
}

function delta(question: SurveyQuestion, mid?: SurveyRow, post?: SurveyRow) {
  return scoreChange(question, mid, post, mid?.recordStatus === 'example');
}

export default function AnonymousTrendsPage() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    getDocs(query(collection(db, 'survey_responses'), orderBy('createdAt', 'desc')))
      .then((snap) => setRows(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SurveyRow))))
      .catch(() => setError('응답을 불러오지 못했습니다. 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  const people = rows.filter((row) => row.surveyType === 'pre').sort((a, b) =>
    (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0) || a.id.localeCompare(b.id));
  const person = people[selected];
  const { mid, post } = person ? stageRows(rows, person.id) : { mid: undefined, post: undefined };
  const changes = questions.map((question) => delta(question, mid, post));
  const improved = changes.filter((change) => change !== null && change > 0).length;
  const same = changes.filter((change) => change === 0).length;
  const lower = changes.filter((change) => change !== null && change < 0).length;
  const comparable = improved + same + lower;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><a className={styles.back} href="/survey-admin">← 설문 관리</a><h1>사전 · 중간 · 사후 변화</h1><p>익명 참여자별로 사전 응답과 문항별 답변 흐름을 확인합니다.</p></div>
      <span className={styles.count}>{people.length}명 · {questions.length}문항</span>
    </header>
    {loading ? <p className={styles.message}>응답을 불러오는 중입니다.</p> : error ? <p className={styles.message} role="alert">{error}</p> : !person ? <p className={styles.message}>사전 응답이 없습니다.</p> :
      <div className={styles.layout}>
        <nav className={styles.people} aria-label="익명 참여자 선택">
          <h2>참여자</h2>
          <div className={styles.peopleList}>{people.map((entry, index) => {
            const pair = stageRows(rows, entry.id);
            const gains = questions.filter((question) => { const value = delta(question, pair.mid, pair.post); return value !== null && value > 0; }).length;
            return <button key={entry.id} className={`${styles.person} ${selected === index ? styles.active : ''}`} aria-current={selected === index ? 'true' : undefined} onClick={() => setSelected(index)}>
              <span>참여자 {String(index + 1).padStart(2, '0')}</span><small>{pair.mid && pair.post ? `중간→사후 ${gains} 상승` : '비교 대기'}</small>
            </button>;
          })}</div>
        </nav>
        <div className={styles.content}>
          <div className={styles.overview}>
            <div><span className={styles.eyebrow}>참여자 {String(selected + 1).padStart(2, '0')}</span><h2>사전 → 중간 → 사후</h2><p>각 문항의 관련 사전 답변부터 중간·사후 답변까지 따라갑니다. 사전은 질문과 척도가 달라 답변 내용으로 비교합니다.</p></div>
            <div><span className={styles.stage}>중간 → 사후 점수 변화</span><div className={styles.metrics} aria-label="중간에서 사후 변화 요약"><span><strong>{improved}</strong> 상승</span><span><strong>{same}</strong> 유지</span><span><strong>{lower}</strong> 하락</span><span><strong>{questions.length - comparable}</strong> 비교 대기</span></div></div>
          </div>
          {[...new Set(questions.map((question) => question.section))].map((section) => <section className={styles.section} key={section}>
            <h3><span>{section}</span> {FOLLOWUP_SECTION_LABELS[section]}</h3>
            {questions.filter((question) => question.section === section).map((question) => {
              const before = relatedPreQuestions(question.id);
              const midValue = response(mid, question);
              const postValue = response(post, question);
              const change = delta(question, mid, post);
              const state = change === null ? '비교 대기' : change > 0 ? `↑ ${change}점 상승` : change < 0 ? `↓ ${Math.abs(change)}점 하락` : '→ 유지';
              return <article className={styles.card} key={question.id}>
                <div className={styles.question}><span className={styles.questionId}>{question.id}</span><h4>{question.title}</h4></div>
                <div className={styles.answers}>
                  <div className={styles.pre}><span className={styles.stage}>① 사전 · 관련 문항</span>{before.length ? before.map((source) => <p key={source.id}><b>{source.id}</b> {source.title}<em>{preAnswer(person, source)}</em></p>) : <p>연결할 사전 문항 없음</p>}</div>
                  <div className={styles.arrow}><span aria-hidden="true">→</span><small>답변 변화</small></div>
                  <div className={styles.stageAnswer}><span className={styles.stage}>② 중간</span><strong>{midValue ?? '—'}</strong><small>{midValue === null ? '응답 없음' : question.options?.find((option) => option.value === midValue)?.label}</small></div>
                  <div className={`${styles.arrow} ${change !== null && change > 0 ? styles.up : ''}`}><span aria-hidden="true">→</span><small>{state}</small></div>
                  <div className={styles.stageAnswer}><span className={styles.stage}>③ 사후</span><strong>{postValue ?? '—'}</strong><small>{postValue === null ? '응답 없음' : question.options?.find((option) => option.value === postValue)?.label}</small></div>
                </div>
              </article>;
            })}
          </section>)}
        </div>
      </div>}
  </main>;
}
