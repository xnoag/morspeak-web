import type { SurveyQuestion } from './survey-questions';
import type { SurveyRow } from './survey-records';

export function surveyDistribution(question: SurveyQuestion, rows: SurveyRow[]) {
  const options = question.options ?? [];
  const valid = new Set(options.map((option) => option.value));
  const counts = new Map(options.map((option) => [option.value, 0]));
  let answered = 0;

  for (const row of rows) {
    const answer = row.answers?.[question.id];
    const values = Array.isArray(answer) ? answer : [answer];
    const selected = [...new Set(values.filter((value): value is string => typeof value === 'string' && valid.has(value)))];
    if (!selected.length) continue;
    answered++;
    for (const value of selected) counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return {
    answered,
    total: rows.length,
    multiple: question.type === 'multi' || question.type === 'multiRanked',
    options: options.map((option) => {
      const count = counts.get(option.value) ?? 0;
      return { ...option, count, percent: answered ? Math.round(count / answered * 100) : 0 };
    }),
  };
}
