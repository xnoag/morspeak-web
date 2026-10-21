import type { Metadata } from 'next';

const title = '모스픽 | 작은 움직임을 언어로, 더 큰 가능성으로';
const description = '모스픽은 작은 움직임을 입력으로 활용해 의사소통과 일상의 선택을 돕는 보조 기술을 만듭니다.';
const image = '/og-morspeak-ko-v1.png';

export const homepageMetadata: Metadata = {
  metadataBase: new URL('https://morspeak.com'),
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Morspeak',
    title,
    description,
    images: [{ url: image, width: 1200, height: 630, alt: '모스픽 — 작은 움직임을 언어로, 더 큰 가능성으로' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};
