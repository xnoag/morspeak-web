import type { Metadata } from 'next';
import Renewal from './home/renewal/ko/Renewal';

export const metadata: Metadata = {
  title: '모스픽 | 작은 움직임을 언어로, 더 큰 가능성으로',
  description: '작은 움직임에서 시작되는 의사소통과 일상의 선택. 모스픽의 솔루션, 입력 방식, 이야기와 개인 이용 절차를 살펴보세요.',
};

export default function HomePage() {
  return <Renewal />;
}
