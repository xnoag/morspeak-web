import { SURVEY_QUESTIONS, type SurveyQuestion } from './survey-questions';
import { FOLLOWUP_VERSION } from './survey-stages';
import { isRecorded, type SurveyRow } from './survey-records';

// 관련 주제의 사전 원문을 찾기 위한 연결이며, 같은 문항 또는 같은 척도라는 뜻은 아니다.
const RELATED_PRE: Record<string, string[]> = {
  'A-1': ['B1'], 'A-2': ['B2'], 'A-3': ['B6'], 'A-4': ['B7'],
  'B-1': ['B13', 'B14'], 'B-2': ['B13', 'B14'],
  'C-1': ['B8'], 'C-2': ['B9', 'B10'], 'C-3': ['B9', 'B10'], 'C-4': ['B12'],
  'D-1': ['B5', 'B3'], 'D-3': ['B4'], 'E-1': ['B16'], 'E-2': ['B14', 'B15'],
  'H-1': ['B1'], 'H-2': ['B2', 'B5'], 'H-3': ['B16'], 'H-4': ['B12'], 'H-5': ['B17'],
};

export function relatedPreQuestions(id: string) {
  return (RELATED_PRE[id] ?? []).map((key) => SURVEY_QUESTIONS.find((q) => q.id === key)!);
}

export function recordedFollowup(rows: SurveyRow[], sourceId: string, stage: 'mid' | 'post') {
  return rows.find((r) => r.sourceResponseId === sourceId && r.surveyType === stage && r.recordStatus === 'recorded' && isRecorded(r) && r.surveyVersion === FOLLOWUP_VERSION);
}

export function scoreChange(q: SurveyQuestion, mid?: SurveyRow, post?: SurveyRow) {
  if (!mid || !post || !isRecorded(mid) || !isRecorded(post) || mid.surveyVersion !== FOLLOWUP_VERSION || post.surveyVersion !== FOLLOWUP_VERSION) return null;
  const a = mid.answers[q.id], b = post.answers[q.id];
  if (typeof a !== 'string' || typeof b !== 'string' || !q.options?.some((o) => o.value === a) || !q.options.some((o) => o.value === b)) return null;
  return Number(b) - Number(a);
}
