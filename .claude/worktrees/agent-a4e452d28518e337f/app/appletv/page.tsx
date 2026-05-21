import type { Metadata } from 'next';
import AppleNav from '@/components/apple/AppleNav';
import AppleTVPage from '@/components/apple/AppleTVPage';
import AppleFooter from '@/components/apple/AppleFooter';

export const metadata: Metadata = {
  title: 'Apple TV 4K - Apple (KR)',
  description: '보다 장대하게 경험하는 Apple의 모든 것.',
};

export default function AppleTVPageRoute() {
  return (
    <>
      <AppleNav />
      <div style={{ paddingTop: '44px' }}>
        <AppleTVPage />
        <AppleFooter />
      </div>
    </>
  );
}
