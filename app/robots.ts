import type { MetadataRoute } from 'next'

// 관리자·내부 화면과 개인정보가 노출되는 경로를 검색엔진 색인에서 제외한다.
// robots.txt 는 강제력이 없으므로 접근 차단은 proxy.ts 가 담당한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/tracking/',
        '/admin/',
        '/survey-admin/',
        '/survey-mindmap/',
        '/waitlist/admin/',
        '/review/admin/',
        '/schedule/training/admin/',
        '/receipts/',        // 재단 정산 — Firebase 이메일 링크 인증
        '/patient-report/',  // 코드로 공유하는 환자별 리포트
        '/api/',
      ],
    },
  }
}
