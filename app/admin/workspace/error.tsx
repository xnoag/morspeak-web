'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="admin-loading" role="alert"><p>화면을 불러오지 못했습니다.</p><button onClick={reset}>다시 시도</button></div>;
}
