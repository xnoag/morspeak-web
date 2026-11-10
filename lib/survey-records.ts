import type { Timestamp } from 'firebase/firestore';
import { getStageQuestions, FOLLOWUP_VERSION, type SurveyStage } from './survey-stages';
import type { SurveyAnswers } from './survey-questions';
import { COMMON_PRE, commonPreScore } from './survey-trends';

export interface SurveyRow {
  id: string;
  createdAt?: Timestamp;
  surveyType: string;
  surveyVersion?: string;
  sourceResponseId?: string;
  recordStatus?: 'draft' | 'recorded' | 'example';
  revision?: number;
  collectedOn?: string;
  interviewNotes?: string;
  patientName: string | null;
  caregiverName: string | null;
  caregiverContact: string | null;
  answers: SurveyAnswers;
  questionTimes?: Record<string, number>;
  answerHistory?: Record<string, string[]>;
  deviceType: string | null;
}

export function followupId(sourceId: string, stage: Exclude<SurveyStage, 'pre'>, example = false) {
  return `${example ? 'example_' : ''}${stage}_${encodeURIComponent(sourceId)}`;
}

export function isRecorded(row: SurveyRow) {
  return row.recordStatus !== 'draft' && row.recordStatus !== 'example';
}

export function visibleFollowup(rows: SurveyRow[], sourceId: string, stage: Exclude<SurveyStage, 'pre'>) {
  const matching = rows.filter((r) => r.sourceResponseId === sourceId && r.surveyType === stage && r.surveyVersion === FOLLOWUP_VERSION);
  return matching.find((r) => r.recordStatus !== 'example') ?? matching.find((r) => r.recordStatus === 'example');
}

export function interviewText(row?: Pick<SurveyRow, 'recordStatus' | 'interviewNotes'>) {
  const notes = row?.interviewNotes ?? '';
  return row?.recordStatus === 'example' && /^(가상 검토 시나리오:|가상 예시:)/.test(notes) ? '' : notes;
}

export function cleanFollowupAnswers(answers: SurveyAnswers, stage: Exclude<SurveyStage, 'pre'>) {
  const clean: SurveyAnswers = {};
  for (const q of getStageQuestions(stage)) {
    if (q.options?.some((o) => o.value === answers[q.id])) clean[q.id] = answers[q.id];
    const comment = answers[`${q.id}_comment`];
    if (typeof comment === 'string' && comment.trim()) clean[`${q.id}_comment`] = comment.trim();
  }
  return clean;
}

export function validateFollowup(answers: SurveyAnswers, stage: Exclude<SurveyStage, 'pre'>, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return '수기로 받은 조사일을 입력해 주세요.';
  const missing = getStageQuestions(stage).filter((q) => !q.options?.some((o) => o.value === answers[q.id]));
  return missing.length ? `답변을 확인해 주세요: ${missing.map((q) => q.id).join(', ')}` : '';
}

// 기존 자동 입력값만 교체하기 위한 기준. 직접 수정한 선택지는 유지한다.
export function legacyPositiveExample(stage: Exclude<SurveyStage, 'pre'>, source?: SurveyRow): SurveyAnswers {
  const answers = Object.fromEntries(getStageQuestions(stage).map((q, i) => [q.id, stage === 'mid' || i % 5 === 0 ? '3' : '4']));
  if (source) for (const { id } of COMMON_PRE) {
    const pre = commonPreScore(id, source);
    if (pre !== null) answers[id] = String(stage === 'mid' ? Math.max(3, pre) : 4);
  }
  return answers;
}

function sampleBucket(sourceId: string, questionId: string, salt: string) {
  let hash = 2166136261;
  for (const char of `${sourceId}:${questionId}:${salt}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 20;
}

// 실제 답변에는 기본값을 넣지 않는다. 참여자와 문항별로 달라지는 내부 검토용 선택지다.
export function positiveExample(stage: Exclude<SurveyStage, 'pre'>, source?: SurveyRow): SurveyAnswers {
  const sourceId = source?.id ?? 'preview';
  return Object.fromEntries(getStageQuestions(stage).map((question) => {
    const bucket = sampleBucket(sourceId, question.id, 'mid');
    let mid = bucket < 5 ? 2 : bucket < 16 ? 3 : 4;
    const pre = source ? commonPreScore(question.id, source) : null;
    if (pre !== null) mid = Math.max(mid, pre);
    const upgrade = sampleBucket(sourceId, question.id, 'post') < 15;
    const value = stage === 'mid' ? mid : Math.min(4, mid + (upgrade ? 1 : 0));
    return [question.id, String(value)];
  }));
}

export function exampleMetadata(source: SurveyRow, stage: Exclude<SurveyStage, 'pre'>) {
  const seed = [...source.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return {
    questionTimes: Object.fromEntries(getStageQuestions(stage).map((q, i) => [q.id, (stage === 'mid' ? 28 : 22) + (seed + i * 7) % 25])),
    deviceType: ['mobile', 'tablet', 'desktop'].includes(source.deviceType ?? '') ? source.deviceType : 'tablet',
  };
}

export function followupPayload(source: SurveyRow, stage: Exclude<SurveyStage, 'pre'>, answers: SurveyAnswers, date: string, notes: string, status: 'draft' | 'recorded' | 'example'): Omit<SurveyRow, 'id' | 'createdAt'> {
  if (source.surveyType !== 'pre') throw new Error('사전 응답 참여자를 선택해 주세요.');
  if (status === 'recorded') {
    const error = validateFollowup(answers, stage, date);
    if (error) throw new Error(error);
  }
  return {
    surveyType: stage, surveyVersion: FOLLOWUP_VERSION, sourceResponseId: source.id,
    patientName: source.patientName, caregiverName: source.caregiverName, caregiverContact: source.caregiverContact,
    answers: cleanFollowupAnswers(answers, stage), collectedOn: date, interviewNotes: notes.trim(),
    recordStatus: status, ...(status === 'example' ? exampleMetadata(source, stage) : { deviceType: 'manual' }),
  };
}
