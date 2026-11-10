import { getStageQuestions, type SurveyStage } from './survey-stages';
import type { SurveyRow } from './survey-records';
import { trendFollowup } from './survey-trends';
import type { SurveyAnswers } from './survey-questions';

export type SharedSurveyRow = Pick<SurveyRow, 'id' | 'surveyType' | 'surveyVersion' | 'sourceResponseId' | 'recordStatus' | 'answers'>;

function choiceAnswers(row: SurveyRow, stage: SurveyStage): SurveyAnswers {
  const answers: SurveyAnswers = {};
  for (const question of getStageQuestions(stage)) {
    if (!question.options?.length) continue;
    const values = question.options.map((option) => option.value);
    const answer = row.answers?.[question.id];
    if (Array.isArray(answer)) {
      const selected = answer.filter((value): value is string => typeof value === 'string' && values.includes(value));
      if (selected.length) answers[question.id] = selected;
    } else if (typeof answer === 'string' && values.includes(answer)) {
      answers[question.id] = answer;
    }
  }
  return answers;
}

// 공유 응답에는 원본 ID·이름·연락처·서술형·인터뷰 메모·입력 시각을 담지 않는다.
export function sharedSurveyRows(rows: SurveyRow[]): SharedSurveyRow[] {
  const people = rows.filter((row) => row.surveyType === 'pre').sort((a, b) =>
    (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0) || a.id.localeCompare(b.id));
  return people.flatMap((person, index) => {
    const id = `participant-${String(index + 1).padStart(2, '0')}`;
    const shared: SharedSurveyRow[] = [{ id, surveyType: 'pre', recordStatus: person.recordStatus, answers: choiceAnswers(person, 'pre') }];
    for (const stage of ['mid', 'post'] as const) {
      const followup = trendFollowup(rows, person.id, stage) ?? trendFollowup(rows, person.id, stage, true);
      if (!followup) continue;
      shared.push({ id: `${stage}-${id}`, surveyType: stage, surveyVersion: followup.surveyVersion, sourceResponseId: id, recordStatus: followup.recordStatus, answers: choiceAnswers(followup, stage) });
    }
    return shared;
  });
}
