// 모스픽 사전 설문(보호자용) 문항 스키마 — 공개 설문 페이지(app/사전설문)와 관리자 페이지(app/설문관리)가 공유한다.

export type QuestionType = 'single' | 'multi' | 'multiRanked' | 'text';

export interface QuestionOption {
  value: string;
  label: string;
  isOther?: boolean;
}

export type SurveyAnswers = Record<string, string | string[] | undefined>;

export interface SurveyQuestion {
  id: string;
  section: 'A' | 'B' | 'C';
  group?: string;
  title: string;
  helperNote?: string;
  type: QuestionType;
  options?: QuestionOption[];
  maxSelect?: number;
  required: boolean;
  placeholder?: string;
  showIf?: (answers: SurveyAnswers) => boolean;
}

const includesA2 = (answers: SurveyAnswers, value: string) =>
  Array.isArray(answers.A2) && answers.A2.includes(value);

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── [A] 기존 의사소통 방식 및 돌봄 상황 ──────────────────────────
  {
    id: 'A1', section: 'A', type: 'single', required: true,
    title: '지난 달을 기준으로 보았을 때, 환자분과 얼마나 함께 시간을 보내시나요?',
    options: [
      { value: 'a', label: '거의 하루 종일 직접 돌봄' },
      { value: 'b', label: '하루 4시간 이내로 자리를 비움 (휴식, 개인 용무 등)' },
      { value: 'c', label: '하루 중 일정 시간 자리를 비움 (직장 등)' },
      { value: 'd', label: '일주일에 며칠만 함께함' },
      { value: 'e', label: '거의 함께하지 않음' },
    ],
  },
  {
    id: 'A2', section: 'A', type: 'multi', required: true,
    title: '현재 환자분과 어떤 방법으로 소통하고 계신가요? 해당하는 방법을 모두 선택해 주세요.',
    options: [
      { value: 'a', label: '의사소통이 거의 어려움' },
      { value: 'b', label: '보호자가 추측하여 의사를 파악' },
      { value: 'c', label: '표정·입모양 읽기' },
      { value: 'd', label: '손짓·몸짓' },
      { value: 'e', label: '글씨 쓰기' },
      { value: 'f', label: '말하기' },
      { value: 'g', label: '글자판 사용' },
      { value: 'h', label: '안구마우스 등 의사소통 보조기기 사용' },
      { value: 'i', label: '기타', isOther: true },
    ],
  },
  {
    id: 'A3', section: 'A', type: 'single', required: true,
    helperNote: 'A3~A6은 보조기기를 사용하지 않는 분만 답변해 주세요.',
    title: '모스픽 이전에 환자분과의 소통을 위해 의사소통 보조기기(안구마우스 등) 도입을 고려해 보신 적이 있으신가요?',
    options: [{ value: 'a', label: '네' }, { value: 'b', label: '아니오' }],
    showIf: (a) => !includesA2(a, 'h'),
  },
  {
    id: 'A4', section: 'A', type: 'text', required: false,
    title: '도입을 가장 우선적으로 고려했던 보조기기(또는 제품명)는 무엇인가요?',
    placeholder: '제품명을 입력해주세요',
    showIf: (a) => !includesA2(a, 'h') && a.A3 === 'a',
  },
  {
    id: 'A5', section: 'A', type: 'single', required: true,
    title: '그렇다면, 실제로 해당 보조기기를 도입하여 사용해 보신 적이 있으신가요? (구매, 대여, 지원 포함)',
    options: [{ value: 'a', label: '네' }, { value: 'b', label: '아니오' }],
    showIf: (a) => !includesA2(a, 'h') && a.A3 === 'a',
  },
  {
    id: 'A6', section: 'A', type: 'multiRanked', maxSelect: 2, required: true,
    title: '실제로 도입을 진행하는 과정에서 어려웠던 점은 무엇이었나요? 중요한 순서대로 2개를 선택해 주세요.',
    options: [
      { value: 'a', label: '관련 정보를 찾기 어려움' },
      { value: 'b', label: '구매 절차가 복잡함' },
      { value: 'c', label: '가격이 부담스러움' },
      { value: 'd', label: '환자가 사용할 수 있을지 확신이 없음' },
      { value: 'e', label: '구매 후 설치·교육·AS가 걱정됨' },
      { value: 'f', label: '기타', isOther: true },
      { value: 'g', label: '특별히 어려움은 없었음' },
    ],
    showIf: (a) => !includesA2(a, 'h') && a.A3 === 'a',
  },
  {
    id: 'A7', section: 'A', type: 'single', required: true,
    helperNote: 'A7은 현재 보조기기를 사용하는 분만 답변해 주세요.',
    title: '그렇다면, 현재 보조기기를 얼마나 자주 사용하고 계신가요?',
    options: [
      { value: 'a', label: '전혀 사용하지 않음' },
      { value: 'b', label: '거의 사용하지 않는 편임' },
      { value: 'c', label: '가끔 사용' },
      { value: 'd', label: '자주 사용하는 편임' },
      { value: 'e', label: '매일 사용함' },
    ],
    showIf: (a) => includesA2(a, 'h'),
  },
  {
    id: 'A8', section: 'A', type: 'multiRanked', maxSelect: 2, required: true,
    helperNote: '보조기기 사용 경험은 있으나 이탈했거나 잘 사용하지 않는 분만 답변해 주세요.',
    title: '현재 보조기기를 자주 사용하지 않는 가장 큰 이유는 무엇인가요? 중요한 순서대로 2개를 선택해 주세요.',
    options: [
      { value: 'a', label: '환자가 사용할 때 신체적으로 불편하거나 피로해서' },
      { value: 'b', label: '인식 정확도가 낮아서' },
      { value: 'c', label: '보호자가 계속 조정해 줘야 해서' },
      { value: 'd', label: '사용 방법이 어려워서' },
      { value: 'e', label: '기능에 대한 사용 방법을 확인하기 어려워서' },
      { value: 'f', label: '기기가 작동하지 않을 때 AS가 잘 안 돼서' },
      { value: 'g', label: '기타', isOther: true },
    ],
    showIf: (a) => a.A5 === 'a' || ['a', 'b', 'c'].includes((a.A7 as string) ?? ''),
  },

  // ── [B] 의사소통 및 일상 참여 범위 ────────────────────────────────
  {
    id: 'B1', section: 'B', group: '의사소통의 명확성 측면', type: 'single', required: true,
    title: '보호자분은 환자분의 의사를 어느 정도 파악할 수 있나요?',
    options: [
      { value: 'a', label: '거의 파악하기 어려움' },
      { value: 'b', label: '예/아니오 등 단순한 표현만 파악할 수 있음' },
      { value: 'c', label: '자주 사용하는 표현만 파악할 수 있음' },
      { value: 'd', label: '표현하는 내용을 대략적으로 파악할 수 있음' },
      { value: 'e', label: '모든 내용을 명확하게 파악할 수 있음' },
    ],
  },
  {
    id: 'B2', section: 'B', group: '의사소통의 명확성 측면', type: 'single', required: true,
    title: '환자분의 의사를 파악하기 위해 보통 몇 번이나 다시 확인해야 하나요?',
    options: [
      { value: 'a', label: '대부분 끝까지 파악하지 못함' },
      { value: 'b', label: '여러 차례 물어보아야 어느 정도 의사를 파악할 수 있음' },
      { value: 'c', label: '한두 번 확인하면 정확하진 않으나 의사를 파악할 수 있음' },
      { value: 'd', label: '한두 번 확인하면 명확하게 파악할 수 있음' },
      { value: 'e', label: '한 번의 표현만으로 바로 파악할 수 있음' },
    ],
  },
  {
    id: 'B3', section: 'B', group: '의사소통의 명확성 측면', type: 'single', required: true,
    title: '보호자분께서는 환자분과 의사소통하는 과정에서 답답함을 느끼는 편이신가요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B4', section: 'B', group: '의사소통의 명확성 측면', type: 'single', required: true,
    title: '환자분이 보호자분 외 다른 사람(다른 가족, 간병인, 활동지원사, 의료진 등)과 소통을 할 때, 보호자분이 대신 설명해야 하는 경우가 얼마나 되나요?',
    options: [
      { value: 'a', label: '매번 보호자분이 대신 설명함' },
      { value: 'b', label: '대체로 보호자분이 대신 설명하는 편임' },
      { value: 'c', label: '반반 정도임' },
      { value: 'd', label: '거의 환자분이 직접 소통하는 편임' },
      { value: 'e', label: '매번 환자분이 직접 소통함' },
    ],
  },
  {
    id: 'B5', section: 'B', group: '의사소통의 명확성 측면', type: 'single', required: true,
    helperNote: '환자분이 직접 소통하지 않는 경우만 답변해 주세요.',
    title: '환자분을 대신하여 다른 사람과 소통할 때, 환자분의 요구사항을 추측하여 대신 전달해야 하는 것이 부담스럽다고 느끼시나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
    showIf: (a) => ['a', 'b', 'c', 'd'].includes((a.B4 as string) ?? ''),
  },
  {
    id: 'B6', section: 'B', group: '의사소통 주제의 다양성 측면', type: 'single', required: true,
    title: '환자분과의 소통은 주로 어떤 범위에서 이루어지고 있나요?',
    options: [
      { value: 'a', label: '의사소통이 거의 어려움' },
      { value: 'b', label: '생존·돌봄에 필요한 요청 중심 (예: 석션, 자세 변경, 통증, 물, 식사, 배변, 호흡 불편 등)' },
      { value: 'c', label: '기본 요청과 간단한 일상 표현이 가능함' },
      { value: 'd', label: '감정, 선호, 일상 대화까지 일부 가능함' },
      { value: 'e', label: '다양한 생각, 감정, 선택, 대화를 비교적 자유롭게 나눌 수 있음' },
    ],
  },
  {
    id: 'B7', section: 'B', group: '의사소통 주제의 다양성 측면', type: 'single', required: true,
    title: '환자분이 "필요한 것" 외에 "하고 싶은 말"을 얼마나 자주 표현하나요?',
    options: [
      { value: 'a', label: '전혀 표현하지 않음' }, { value: 'b', label: '거의 표현하지 않는 편임' },
      { value: 'c', label: '가끔 표현함' }, { value: 'd', label: '자주 표현하는 편임' }, { value: 'e', label: '매일 표현함' },
    ],
  },
  {
    id: 'B8', section: 'B', group: '의사소통의 적시성 측면', type: 'single', required: true,
    title: '보호자분은 환자분의 신체적 불편이나 돌봄 필요를 바로 인지할 수 있나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B9', section: 'B', group: '의사소통의 적시성 측면', type: 'single', required: true,
    title: '평소 환자분은 보호자분에게 도움을 요청할 때 어떻게 표현하시나요?',
    options: [
      { value: 'a', label: '거의 표현하기 어려움' },
      { value: 'b', label: '표정이나 입모양으로 표현' },
      { value: 'c', label: '소리를 내어 표현 (이갈이, 말소리 등)' },
      { value: 'd', label: '도구나 신호를 활용하여 표현' },
      { value: 'e', label: '기타', isOther: true },
    ],
  },
  {
    id: 'B10', section: 'B', group: '의사소통의 적시성 측면', type: 'single', required: true,
    title: '환자분이 도움을 요청할 때 알아차리려면 얼마나 가까이 있어야 하나요?',
    options: [
      { value: 'a', label: '바로 옆에서 눈으로 보고 있어야만 가능' },
      { value: 'b', label: '바로 옆에서 환자분을 보지 않아도 가능' },
      { value: 'c', label: '같은 공간(집, 병원)의 다른 방에 있어도 가능' },
      { value: 'd', label: '환자가 있는 공간(집, 병원) 밖에 있어도 가능' },
    ],
  },
  {
    id: 'B11', section: 'B', group: '의사소통의 적시성 측면', type: 'single', required: true,
    title: '최근 1개월 내, 환자분 혼자 있는 상황에서 보호자분이 가장 멀리 있었던 곳은 어디였나요?',
    options: [
      { value: 'a', label: '늘 환자 곁에 있었음' },
      { value: 'b', label: '같은 공간(집, 병원)의 다른 방' },
      { value: 'c', label: '환자가 있는 공간(집, 병원) 밖' },
    ],
  },
  {
    id: 'B12', section: 'B', group: '의사소통의 적시성 측면', type: 'single', required: true,
    title: '보호자분은 환자분 곁을 잠시 비워도 안심할 수 있다고 느끼시나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B13', section: 'B', group: '일상제어 및 자기결정권 측면', type: 'single', required: true,
    title: '보호자분의 도움 없이 환자분이 전자기기를 활용해 혼자 할 수 있는 행동이 많다고 생각하시나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B14', section: 'B', group: '일상제어 및 자기결정권 측면', type: 'multi', required: true,
    title: '보호자분의 도움 없이 환자분이 전자기기를 활용해 할 수 있는 행동을 모두 선택해 주세요.',
    options: [
      { value: 'a', label: '조명 조절' }, { value: 'b', label: '온도 조절' }, { value: 'c', label: '인터넷 검색' },
      { value: 'd', label: '영상 시청' }, { value: 'e', label: '음악 감상' }, { value: 'f', label: '온라인 쇼핑' },
      { value: 'g', label: '메신저로 다른 사람과 소통' }, { value: 'h', label: '보호자 호출' },
      { value: 'i', label: '기타', isOther: true }, { value: 'j', label: '보호자 도움 없이는 행동하기 어려움' },
    ],
  },
  {
    id: 'B15', section: 'B', group: '일상제어 및 자기결정권 측면', type: 'single', required: true,
    title: '환자분은 가족의 대화나 의사결정에 자신의 의견을 표현하며 참여하고 있나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B16', section: 'B', group: '일상제어 및 자기결정권 측면', type: 'single', required: true,
    title: '환자분의 일상과 관련된 의사결정을 할 때 환자분의 의견이 충분히 반영되고 있다고 생각하시나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },
  {
    id: 'B17', section: 'B', group: '환자분과의 관계', type: 'single', required: true,
    title: '환자분과 함께하는 시간이 즐겁고 편안하게 느껴지시나요?',
    options: [
      { value: 'a', label: '전혀 그렇지 않다' }, { value: 'b', label: '그렇지 않다' },
      { value: 'c', label: '보통이다' }, { value: 'd', label: '그렇다' }, { value: 'e', label: '매우 그렇다' },
    ],
  },

  // ── [C] 니즈 및 기대사항 ─────────────────────────────────────────
  {
    id: 'C1', section: 'C', type: 'multi', required: true,
    title: '모스픽을 통해 가장 먼저 개선되기를 기대하는 부분은 무엇인가요? (복수 선택 가능)',
    options: [
      { value: 'a', label: '환자의 명확한 요구사항 파악' },
      { value: 'b', label: '환자의 의사소통에 대한 피로감 감소' },
      { value: 'c', label: '환자와의 일상적인 대화' },
      { value: 'd', label: '긴급 상황에서의 알림' },
      { value: 'e', label: '직접 문자, 카카오톡 등 외부 연락' },
      { value: 'f', label: '직접 영상, 음악 등 여가 선택' },
      { value: 'g', label: '직접 조명, 선풍기 등 주변 환경 조절' },
      { value: 'h', label: '기타', isOther: true },
    ],
  },
  {
    id: 'C2', section: 'C', type: 'multi', required: true,
    title: '현재 보호자분이 가장 줄어들었으면 하는 부담은 무엇인가요? (복수 선택 가능)',
    options: [
      { value: 'a', label: '환자분의 요구를 추측해야 하는 부담' },
      { value: 'b', label: '같은 질문을 반복해서 확인해야 하는 부담' },
      { value: 'c', label: '환자분의 손이나 목소리 역할을 대신해야 하는 부담' },
      { value: 'd', label: '환자분 곁을 잠시 비우기 어려운 부담' },
      { value: 'e', label: '환자분이 불편함을 제때 알리지 못할까 봐 생기는 불안' },
      { value: 'f', label: '기타', isOther: true },
    ],
  },
  {
    id: 'C3', section: 'C', type: 'multi', required: true,
    title: '모스픽 사용 후 "도움이 되었다"고 느끼려면 어떤 변화가 가장 중요하다고 생각하시나요? (복수 선택 가능)',
    options: [
      { value: 'a', label: '환자분의 의사를 더 정확히 알 수 있는 것' },
      { value: 'b', label: '환자분의 요구를 더 빠르게 파악할 수 있는 것' },
      { value: 'c', label: '환자분이 직접 보호자를 부를 수 있는 것' },
      { value: 'd', label: '보호자가 잠시 자리를 비워도 안심할 수 있는 것' },
      { value: 'e', label: '환자분이 감정이나 생각을 더 표현할 수 있는 것' },
      { value: 'f', label: '환자분이 가족 대화에 더 참여할 수 있는 것' },
      { value: 'g', label: '환자분이 직접 문자, 연락, 여가활동을 선택할 수 있는 것' },
      { value: 'h', label: '환자분의 일상에서 본인의 선택이 더 반영되는 것' },
      { value: 'i', label: '기타', isOther: true },
    ],
  },
];

export function getVisibleQuestions(section: SurveyQuestion['section'], answers: SurveyAnswers) {
  return SURVEY_QUESTIONS.filter((q) => q.section === section && (!q.showIf || q.showIf(answers)));
}

export function isQuestionAnswered(q: SurveyQuestion, answers: SurveyAnswers) {
  if (!q.required) return true;
  const v = answers[q.id];
  if (q.type === 'multiRanked') return Array.isArray(v) && v.length === (q.maxSelect ?? 2);
  if (q.type === 'multi') return Array.isArray(v) && v.length > 0;
  return typeof v === 'string' && v.length > 0;
}

export function isSectionComplete(section: SurveyQuestion['section'], answers: SurveyAnswers) {
  return getVisibleQuestions(section, answers).every((q) => isQuestionAnswered(q, answers));
}

export function formatAnswerLabel(q: SurveyQuestion, answers: SurveyAnswers) {
  const v = answers[q.id];
  const otherText = answers[`${q.id}_other`] as string | undefined;
  const labelOf = (val: string) => q.options?.find((o) => o.value === val)?.label ?? val;
  if (q.type === 'text') return (v as string) || '(응답 없음)';
  if (Array.isArray(v)) {
    if (v.length === 0) return '(응답 없음)';
    return v
      .map((val, i) => {
        const l = labelOf(val);
        const rank = q.type === 'multiRanked' ? `${i + 1}순위) ` : '';
        const other = q.options?.find((o) => o.value === val)?.isOther && otherText ? `: ${otherText}` : '';
        return `${rank}${l}${other}`;
      })
      .join(', ');
  }
  if (!v) return '(응답 없음)';
  const other = q.options?.find((o) => o.value === v)?.isOther && otherText ? `: ${otherText}` : '';
  return `${labelOf(v as string)}${other}`;
}
