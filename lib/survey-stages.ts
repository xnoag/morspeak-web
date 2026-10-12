import { SURVEY_QUESTIONS, type SurveyQuestion } from './survey-questions';

export const SURVEY_STAGES = { pre: '사전', mid: '중간', post: '사후' } as const;
export type SurveyStage = keyof typeof SURVEY_STAGES;

// 원본: 멘토링 논의사항의 (0629) 설문 - 피드백 탭. 기존 B문항의 보기·값을 그대로 사용한다.
const POST_QUESTIONS: SurveyQuestion[] = [
  ['D1', '전반적으로 모스픽 도입 과정에 만족하셨나요?'],
  ['D2', '기기 수령 후 진행된 교육은 환자와 보호자가 기기의 사용방법을 익히는데 충분했나요?'],
  ['D3', '기기 수령 후 보호자가 기기를 조정하거나 개입해야 하는 경우가 많았나요?'],
  ['D4', '장기 사용 기기 도입 전, 환자분이 사용할 수 있을지 충분히 판단할 수 있었나요?'],
].map(([id, title]) => ({
  id, title, section: 'D', type: 'single', required: true,
  options: (id === 'D3'
    ? ['거의 없었다', '적은 편이다', '보통이다', '많은 편이다', '매우 많았다']
    : ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다']
  ).map((label, index) => ({ value: String.fromCharCode(97 + index), label })),
}));

export function getStageQuestions(stage: SurveyStage): SurveyQuestion[] {
  if (stage === 'pre') return SURVEY_QUESTIONS;
  const common = SURVEY_QUESTIONS.filter((q) => q.section === 'B');
  return stage === 'post' ? [...common, ...POST_QUESTIONS] : common;
}
