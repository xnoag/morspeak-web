import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '설문 응답 관리 | Morspeak',
  description: '모스픽 사전 설문 응답을 조회·관리하는 내부 페이지입니다.',
};

export default function SurveyAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
