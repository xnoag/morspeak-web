import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '모스픽 사전 설문 | Morspeak',
  description: '모스픽 도입 전, 보호자분께 기존 의사소통 방식과 돌봄 상황을 여쭤보는 사전 설문입니다.',
};

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
