import { SURVEY_QUESTIONS, type SurveyQuestion } from './survey-questions';
import { FOLLOWUP_VERSION } from './survey-stages';
import type { SurveyRow } from './survey-records';

// 관련 주제의 사전 원문을 찾기 위한 연결이며, 같은 문항 또는 같은 척도라는 뜻은 아니다.
const RELATED_PRE: Record<string, string[]> = {
  'A-1': ['B1'], 'A-2': ['B2'], 'A-3': ['B6'], 'A-4': ['B7'],
  'B-1': ['B13', 'B14'], 'B-2': ['B13', 'B14'],
  'C-1': ['B8'], 'C-2': ['B9', 'B10'], 'C-3': ['B9', 'B10'], 'C-4': ['B12'],
  'D-1': ['B5', 'B3'], 'D-2': ['B16', 'B5'], 'D-3': ['B4'], 'E-1': ['B16'], 'E-2': ['B14', 'B15'],
  'H-1': ['B1'], 'H-2': ['B2', 'B5'], 'H-3': ['B16'], 'H-4': ['B12'], 'H-5': ['B17'],
};

export function relatedPreQuestions(id: string) {
  return (RELATED_PRE[id] ?? []).map((key) => SURVEY_QUESTIONS.find((q) => q.id === key)!);
}

// 세 시점 모두 같은 방향의 5단계 보기로 묻는 핵심 주제만 참고 추이에 포함한다.
export const COMMON_PRE = [
  { id: 'A-1', preId: 'B1', label: '의사 파악' },
  { id: 'A-3', preId: 'B6', label: '소통 범위' },
  { id: 'D-3', preId: 'B4', label: '대신 설명' },
] as const;

export function commonPreScore(id: string, row: SurveyRow) {
  const preId = COMMON_PRE.find((item) => item.id === id)?.preId;
  const question = SURVEY_QUESTIONS.find((item) => item.id === preId);
  const answer = preId && row.answers?.[preId];
  if (row.surveyType !== 'pre' || !question?.options || question.options.length !== 5 || typeof answer !== 'string') return null;
  const index = question.options.findIndex((option) => option.value === answer);
  return index < 0 ? null : index;
}

export function trendFollowup(rows: SurveyRow[], sourceId: string, stage: 'mid' | 'post', example = false) {
  return rows.find((r) => r.sourceResponseId === sourceId && r.surveyType === stage && r.recordStatus === (example ? 'example' : 'recorded') && r.surveyVersion === FOLLOWUP_VERSION);
}

export function scoreChange(q: SurveyQuestion, mid?: SurveyRow, post?: SurveyRow, example = false) {
  const status = example ? 'example' : 'recorded';
  if (!mid || !post || !mid.sourceResponseId || mid.sourceResponseId !== post.sourceResponseId || mid.surveyType !== 'mid' || post.surveyType !== 'post' || mid.recordStatus !== status || post.recordStatus !== status || mid.surveyVersion !== FOLLOWUP_VERSION || post.surveyVersion !== FOLLOWUP_VERSION) return null;
  const a = mid.answers[q.id], b = post.answers[q.id];
  if (typeof a !== 'string' || typeof b !== 'string' || !q.options?.some((o) => o.value === a) || !q.options.some((o) => o.value === b)) return null;
  return Number(b) - Number(a);
}
