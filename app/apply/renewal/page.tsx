import type { Metadata } from 'next';
import ScreeningPreview from './ScreeningPreview';

export const metadata: Metadata = {
  title: '모스픽 움직임 검사 · 미리보기',
  description: '정보 입력과 다섯 가지 움직임 검사를 미리 체험합니다.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ScreeningPreview />;
}
