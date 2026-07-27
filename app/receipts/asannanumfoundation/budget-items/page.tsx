'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 예산 세목 목록은 메인 페이지로 통합됨
export default function BudgetItemsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/receipts/asannanumfoundation');
  }, [router]);
  return null;
}
