import { SURVEY_QUESTIONS, type SurveyQuestion } from './survey-questions';

export const SURVEY_STAGES = { pre: '사전', mid: '중간', post: '사후' } as const;
export type SurveyStage = keyof typeof SURVEY_STAGES;

// 원본: 멘토링 논의사항 (0624) 설문 탭. 6/29 사전 응답과 다른 버전이므로 자동 환산하지 않는다.
export const FOLLOWUP_VERSION = 'mentoring-0624';
export const FOLLOWUP_SECTION_LABELS: Record<string, string> = {
  "A": "의사 파악과 소통 범위",
  "B": "직접 실행과 신체 의존",
  "C": "돌봄 요청과 안전",
  "D": "보호자의 추측·대리 판단 부담",
  "E": "자기결정권·관계·일상 참여",
  "H": "모스픽 사용 후 변화"
};

const FOLLOWUP_QUESTIONS: SurveyQuestion[] = [
  {
    id: "A-1", section: "A", type: 'single', required: true,
    title: "보호자분은 환자분의 의사를 어느 정도 파악하고 있나요?",
    options: [
      {"value": "0", "label": "거의 파악하기 어렵다"},
      {"value": "1", "label": "예/아니오나 매우 단순한 요구만 파악할 수 있다"},
      {"value": "2", "label": "반복해서 확인하면 기본적인 요구는 파악할 수 있다"},
      {"value": "3", "label": "시간이 걸리지만 구체적인 요구나 생각도 어느 정도 파악할 수 있다"},
      {"value": "4", "label": "환자분의 의사를 비교적 명확하게 파악할 수 있다"},
    ],
  },
  {
    id: "A-2", section: "A", type: 'single', required: true,
    title: "환자분의 의사를 파악하는 데 걸리는 시간은 어느 정도인가요?",
    options: [
      {"value": "0", "label": "대부분 매우 오래 걸리거나 끝까지 파악하지 못한다"},
      {"value": "1", "label": "파악하는 데 오래 걸리는 경우가 많다"},
      {"value": "2", "label": "내용에 따라 시간이 걸리지만 기본적인 요구는 확인할 수 있다"},
      {"value": "3", "label": "비교적 짧은 시간 안에 파악할 수 있는 경우가 많다"},
      {"value": "4", "label": "대부분 빠르게 파악할 수 있다"},
    ],
  },
  {
    id: "A-3", section: "A", type: 'single', required: true,
    title: "환자분과의 소통은 주로 어떤 범위에서 이루어지고 있나요?",
    options: [
      {"value": "0", "label": "거의 소통이 어렵다"},
      {"value": "1", "label": "생존·돌봄에 필요한 요청 위주다  예: 석션, 자세 변경, 통증, 물, 식사, 배변, 호흡 불편 등"},
      {"value": "2", "label": "기본 요청과 간단한 일상 표현이 가능하다"},
      {"value": "3", "label": "감정, 선호, 일상 대화까지 일부 가능하다"},
      {"value": "4", "label": "다양한 생각, 감정, 선택, 대화를 비교적 자유롭게 나눌 수 있다"},
    ],
  },
  {
    id: "A-4", section: "A", type: 'single', required: true,
    title: "환자분이 “필요한 것” 외에 “하고 싶은 말”을 전하는 기회는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 없다"},
      {"value": "1", "label": "매우 드물다"},
      {"value": "2", "label": "가끔 있지만 제한적이다"},
      {"value": "3", "label": "종종 있고, 보호자도 어느 정도 확인할 수 있다"},
      {"value": "4", "label": "비교적 자주 있고, 내용도 어느 정도 충분히 확인할 수 있다"},
    ],
  },
  {
    id: "B-1", section: "B", type: 'single', required: true,
    title: "보호자분이 환자분을 대신해 실행하거나 조작해주는 일은 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 모든 일을 대신 실행하거나 조작해야 한다"},
      {"value": "1", "label": "대부분의 일을 대신해줘야 한다"},
      {"value": "2", "label": "자주 대신해주지만 일부는 환자분이 직접 할 수 있다"},
      {"value": "3", "label": "일부 상황에서만 대신해주면 된다"},
      {"value": "4", "label": "대신 실행하거나 조작해주는 일이 많지 않다"},
    ],
  },
  {
    id: "B-2", section: "B", type: 'single', required: true,
    title: "환자분이 보호자 도움 없이 일상 기기나 활동을 직접할 수 있는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 시작할 수 없다"},
      {"value": "1", "label": "매우 제한적인 상황에서만 가능하다"},
      {"value": "2", "label": "보호자 도움이 있으면 일부 가능하다"},
      {"value": "3", "label": "몇 가지 활동은 제한적으로 직접 시작할 수 있다"},
      {"value": "4", "label": "필요한 활동을 비교적 직접 시작할 수 있다"},
    ],
  },
  {
    id: "C-1", section: "C", type: 'single', required: true,
    title: "보호자분은 환자분의 신체적 불편이나 돌봄 필요를 어느 정도 제때 파악하고 있나요?",
    options: [
      {"value": "0", "label": "거의 제때 파악하기 어렵다"},
      {"value": "1", "label": "늦게 알아차리는 경우가 많다"},
      {"value": "2", "label": "기본적인 요청은 파악하지만 시간이 걸린다"},
      {"value": "3", "label": "대부분의 불편이나 돌봄 필요를 비교적 제때 파악한다"},
      {"value": "4", "label": "환자분의 불편이나 돌봄 필요를 빠르고 명확하게 파악한다"},
    ],
  },
  {
    id: "C-2", section: "C", type: 'single', required: true,
    title: "환자분이 긴급하거나 불편한 상황을 보호자에게 알릴 수 있는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 알릴 수 없다"},
      {"value": "1", "label": "매우 제한적인 신호로만 알릴 수 있다"},
      {"value": "2", "label": "보호자가 가까이 있거나 주의 깊게 봐야 알 수 있다"},
      {"value": "3", "label": "일부 상황에서는 비교적 분명히 알릴 수 있다"},
      {"value": "4", "label": "긴급하거나 불편한 상황을 비교적 안정적으로 알릴 수 있다"},
    ],
  },
  {
    id: "C-3", section: "C", type: 'single', required: true,
    title: "환자분이 보호자분을 직접 부를 수 있는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "직접 부를 방법이 거의 없다"},
      {"value": "1", "label": "매우 제한적인 방식으로만 가능하다  예: 소리, 눈빛, 이갈이 등"},
      {"value": "2", "label": "보호자가 가까이 있으면 알아차릴 수 있다"},
      {"value": "3", "label": "특정 신호나 도구를 통해 어느 정도 부를 수 있다"},
      {"value": "4", "label": "보호자가 곁에 없을 때도 비교적 안정적으로 부를 수 있다"},
    ],
  },
  {
    id: "C-4", section: "C", type: 'single', required: true,
    title: "보호자분은 환자분 곁을 잠시 비울 때 어느 정도 안심할 수 있나요?",
    options: [
      {"value": "0", "label": "거의 안심할 수 없다"},
      {"value": "1", "label": "아주 짧은 시간만 가능하지만 불안이 크다"},
      {"value": "2", "label": "가까운 거리에서는 잠시 가능하지만 계속 신경 쓰인다"},
      {"value": "3", "label": "일정 시간은 가능하며 어느 정도 안심할 수 있다"},
      {"value": "4", "label": "환자분이 필요 시 알릴 수 있어 비교적 안심할 수 있다"},
    ],
  },
  {
    id: "D-1", section: "D", type: 'single', required: true,
    title: "환자분의 요구를 추측하거나 확인해야 하는 과정에서 보호자분이 느끼는 부담은 어느 정도인가요?",
    options: [
      {"value": "0", "label": "부담이 매우 크다"},
      {"value": "1", "label": "부담이 큰 편이다"},
      {"value": "2", "label": "상황에 따라 부담을 느낀다"},
      {"value": "3", "label": "부담이 크지 않은 편이다"},
      {"value": "4", "label": "환자분의 요구를 비교적 명확히 확인할 수 있어 부담이 적다"},
    ],
  },
  {
    id: "D-2", section: "D", type: 'single', required: true,
    title: "환자분의 의사를 대신 판단해야 하는 상황은 어느 정도 발생하나요?",
    options: [
      {"value": "0", "label": "거의 항상 대신 판단해야 한다"},
      {"value": "1", "label": "대신 판단해야 하는 경우가 많다"},
      {"value": "2", "label": "일부 상황에서는 대신 판단해야 한다"},
      {"value": "3", "label": "가끔 대신 판단하는 정도다"},
      {"value": "4", "label": "환자분의 의사를 직접 확인할 수 있어 대신 판단하는 경우가 적다"},
    ],
  },
  {
    id: "D-3", section: "D", type: 'single', required: true,
    title: "보호자분이 환자분의 의사를 다른 가족, 간병인, 활동지원사, 의료진에게 대신 설명해야 하는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 항상 보호자분이 대신 설명해야 한다"},
      {"value": "1", "label": "대신 설명해야 하는 경우가 많다"},
      {"value": "2", "label": "일부 상황에서는 대신 설명해야 한다"},
      {"value": "3", "label": "가끔 대신 설명하는 정도다"},
      {"value": "4", "label": "환자분의 의사가 다른 사람에게도 비교적 직접 전달될 수 있다"},
    ],
  },
  {
    id: "E-1", section: "E", type: 'single', required: true,
    title: "환자분의 일상에서 본인의 의사가 반영되는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "대부분 주변 사람이 판단하거나 결정한다"},
      {"value": "1", "label": "환자분의 의사를 반영하기 어려운 경우가 많다"},
      {"value": "2", "label": "일부 선택이나 결정에는 반영된다"},
      {"value": "3", "label": "중요한 일상 선택에는 어느 정도 반영된다"},
      {"value": "4", "label": "환자분의 의사가 일상에 비교적 충분히 반영된다"},
    ],
  },
  {
    id: "E-2", section: "E", type: 'single', required: true,
    title: "환자분이 가족 대화, 여가, 연락, 주변 환경 조절 등 일상 활동에 참여하는 정도는 어느 정도인가요?",
    options: [
      {"value": "0", "label": "거의 참여하기 어렵다"},
      {"value": "1", "label": "보호자가 대부분 대신 선택하거나 실행한다"},
      {"value": "2", "label": "보호자 도움을 받으면 일부 참여할 수 있다"},
      {"value": "3", "label": "제한은 있지만 몇 가지 활동에는 직접 참여할 수 있다"},
      {"value": "4", "label": "원하는 활동에 비교적 직접 참여할 수 있다"},
    ],
  },
  {
    id: "H-1", section: "H", type: 'single', required: true,
    title: "모스픽 사용 후, 보호자분은 환자분의 의사를 파악하는 과정이 어떻게 달라졌다고 느끼시나요?",
    options: [
      {"value": "0", "label": "이전과 거의 달라진 점이 없다"},
      {"value": "1", "label": "일부 상황에서만 조금 도움이 된다"},
      {"value": "2", "label": "기본적인 요구를 파악할 때는 도움이 된다"},
      {"value": "3", "label": "환자분의 의사를 전보다 더 명확하게 파악하는 경우가 늘었다"},
      {"value": "4", "label": "환자분의 의사를 파악하는 과정이 전반적으로 훨씬 수월해졌다"},
    ],
  },
  {
    id: "H-2", section: "H", type: 'single', required: true,
    title: "모스픽 사용 후, 환자분의 요구를 확인하는 과정에서 보호자분의 반복 확인이나 추측은 어떻게 달라졌나요?",
    options: [
      {"value": "0", "label": "여전히 대부분 보호자가 추측하거나 반복 확인해야 한다"},
      {"value": "1", "label": "일부 단순한 요청에서만 추측이나 반복 확인이 줄었다"},
      {"value": "2", "label": "기본적인 요청에서는 추측이나 반복 확인이 줄어든 편이다"},
      {"value": "3", "label": "여러 상황에서 환자분의 요구를 직접 확인할 수 있게 되었다"},
      {"value": "4", "label": "보호자가 추측하기보다 환자분의 표현을 통해 확인하는 경우가 뚜렷하게 늘었다"},
    ],
  },
  {
    id: "H-3", section: "H", type: 'single', required: true,
    title: "모스픽 사용 후, 환자분의 의사를 대신 판단하거나 결정해야 하는 상황은 어떻게 달라졌나요?",
    options: [
      {"value": "0", "label": "여전히 대부분 보호자가 대신 판단하거나 결정한다"},
      {"value": "1", "label": "일부 단순한 선택에서만 환자분의 의사를 확인할 수 있다"},
      {"value": "2", "label": "기본적인 선택이나 요구는 환자분의 의사를 확인하고 결정할 수 있다"},
      {"value": "3", "label": "전보다 환자분의 선호나 거부 의사를 확인하고 결정하는 경우가 늘었다"},
      {"value": "4", "label": "보호자가 대신 판단하기보다 환자분의 의사를 기준으로 결정하는 경우가 뚜렷하게 늘었다"},
    ],
  },
  {
    id: "H-4", section: "H", type: 'single', required: true,
    title: "모스픽 사용 후, 보호자분이 환자분 곁을 잠시 비울 때 느끼는 마음은 어떻게 달라졌나요?",
    options: [
      {"value": "0", "label": "이전과 거의 달라진 점이 없고 여전히 불안하다"},
      {"value": "1", "label": "아주 짧은 순간에는 조금 덜 불안하다"},
      {"value": "2", "label": "가까운 거리에서는 잠시 자리를 비울 수 있게 되었다"},
      {"value": "3", "label": "환자분이 필요할 때 알릴 수 있다는 생각에 전보다 안심되는 순간이 늘었다"},
      {"value": "4", "label": "환자분과 떨어져 있는 짧은 시간에 대한 불안이 전반적으로 많이 줄었다"},
    ],
  },
  {
    id: "H-5", section: "H", type: 'single', required: true,
    title: "모스픽 사용 후, 보호자분은 환자분과의 관계나 소통에서 어떤 변화를 느끼셨나요?",
    options: [
      {"value": "0", "label": "이전과 거의 달라진 점이 없다"},
      {"value": "1", "label": "일부 순간에만 작은 변화를 느꼈다"},
      {"value": "2", "label": "돌봄 요청 외에 환자분의 생각이나 감정을 확인하는 순간이 생겼다"},
      {"value": "3", "label": "환자분과 일상적인 대화나 감정 표현을 나누는 순간이 전보다 늘었다"},
      {"value": "4", "label": "환자분과 다시 연결되어 있다고 느끼는 순간이 뚜렷하게 늘었다"},
    ],
  },
];

export function getStageQuestions(stage: SurveyStage): SurveyQuestion[] {
  return stage === 'pre' ? SURVEY_QUESTIONS : FOLLOWUP_QUESTIONS;
}
