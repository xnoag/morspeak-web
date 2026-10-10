export const movements = [
  { id: 'blink', name: '눈 깜빡임', detail: '눈을 감았다가 다시 떠보세요.', verb: '눈을 감았다가 떠주세요', kind: 'video' },
  { id: 'mouth', name: '입 벌림', detail: '입을 벌렸다가 다시 닫아보세요.', verb: '입을 벌렸다가 닫아주세요', kind: 'video' },
  { id: 'eyebrow', name: '눈썹 올리기', detail: '눈썹을 위로 올렸다가 내려보세요.', verb: '눈썹을 올렸다가 내려주세요', kind: 'video' },
  { id: 'finger', name: '손가락 누르기', detail: '화면의 큰 버튼을 눌러보세요.', verb: '버튼을 눌렀다가 떼주세요', kind: 'press' },
  { id: 'blow', name: '바람 불기', detail: '휴대폰 마이크 쪽으로 가볍게 불어보세요.', verb: '휴대폰 마이크 쪽으로 불어주세요', kind: 'audio' },
] as const;
export type MovementId = typeof movements[number]['id'];
export const phases = [
  { name: '짧게', targets: ['짧게', '짧게', '짧게', '짧게', '짧게'] },
  { name: '길게', targets: ['길게', '길게', '길게', '길게', '길게'] },
  { name: '섞어서', targets: ['짧게', '길게', '짧게', '짧게', '길게'] },
] as const;
export const regions = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
export const relationships = ['배우자', '자녀', '부모', '형제/자매', '기타 가족', '간병인/요양보호사', '본인'];
export const communicationMethods = ['추측', '직접 의사소통', '글자판', '안구마우스', '소통이 어려운 상태', '기타'];
export const referralSources = ['인터넷 검색', '유튜브', '인스타그램 · 페이스북', '뉴스 · 기사', '병원 · 의료진 소개', '환우회 · 환자 모임', '지인 소개', '기타'];

export function guidanceDates(now = new Date()): string[] {
  const koreaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const day = new Date(`${koreaDate}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + (((8 - day.getUTCDay()) % 7) || 7));
  return Array.from({ length: 5 }, (_, i) => {
    const next = new Date(day);
    next.setUTCDate(day.getUTCDate() + i * 14);
    return next.toISOString().slice(0, 10);
  });
}

export function recordingMime(kind: 'video' | 'audio', supports: (mime: string) => boolean): string | undefined {
  const candidates = kind === 'video'
    ? ['video/mp4', 'video/webm;codecs=vp8', 'video/webm']
    : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  return candidates.find(supports);
}
