import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설문 변화 공유 | Morspeak',
  description: '모스픽 사전·중간·사후 설문 선택지와 문항별 비율을 익명으로 살펴봅니다.',
  robots: { index: false, follow: false },
};

export default function SurveyShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
