'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeLoginFromLink } from '@/lib/receiptAuth';

const F = "-apple-system,'SF Pro Display',BlinkMacSystemFont,'Helvetica Neue',sans-serif";

export default function LoginFinishPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    completeLoginFromLink().then(res => {
      if (res.ok) {
        router.replace('/receipts/asannanumfoundation');
      } else {
        setError(res.error);
      }
    });
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F8', fontFamily: F }}>
      <div style={{ fontSize: 14, color: '#1C1C1E', textAlign: 'center' }}>
        {error ? (
          <>
            <p>로그인에 실패했습니다 ({error}).</p>
            <a href="/receipts/asannanumfoundation/login" style={{ color: '#1A73E8' }}>다시 로그인하기</a>
          </>
        ) : '로그인 처리 중…'}
      </div>
    </div>
  );
}
