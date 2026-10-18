# 모스픽 기업 홈페이지 개편 검토 기록 — 2026-10-18

## 검토 대상

- 격리 worktree: `/Users/xnoag/.ouroboros/worktrees/orch_afc21c60f87a/ralph-5c503ddca64b27f7c02869ca0834a3`
- 브랜치: `ooo/ralph-5c503ddca64b27f7c02869ca0834a3` (메인 체크아웃 `feat/unified-admin`의 `19ef1bb`에서 분기)
- 대상: `/home/renewal`, `/home/renewal/stories`, 하위 이야기 페이지, `/waitlist`와 `/contact`로 향하는 링크
- 소스: `app/home/renewal/Renewal.tsx`, `app/home/renewal/renewal.module.css`, `app/home/renewal/stories/`, `app/contact/page.tsx`, `components/ContactForm.tsx`
- 검토용 로컬 URL: `http://127.0.0.1:3187/home/renewal` (`npm run start -- --hostname 127.0.0.1 --port 3187` 실행 중에만 접근 가능)

## 먼저 확인한 공통 검증 단계

- 초기 `npm run lint`와 `npm run build`는 이 worktree에 `node_modules`가 없어 각각 `eslint: command not found`, `next: command not found`로 실패했습니다. `npm ci`로 잠금 파일의 의존성을 복원했습니다.
- 복원 후 전체 린트는 88 오류·789 경고로 실패했습니다. 오류는 관리자·추적 등 기존 화면, Firebase 함수, 제공된 MediaPipe 파일에 있으며 이번 변경 파일에는 없습니다. 전체 린트는 `blocked_by_gate`, 이번 변경 범위 린트는 `assessed_pass`입니다.
- 설정 없이 빌드하면 `/admin/inquiries` 사전 렌더에서 `auth/invalid-api-key`로 실패했습니다. 비밀값이나 운영 DB를 쓰지 않는 합성 Firebase 공개 설정을 프로세스 환경에만 주입해 빌드 단계를 검증했습니다.

## 이번 변경의 평가

- 변경 파일 대상 ESLint: 오류 0건, 기존 `<img>` 경고 3건 (`assessed_pass`).
- `npm test`: 일곱 영역, 목적지 HTTP 200, 이야기 목록·상세, 출처 구분, 개인·협업 CTA와 접수 의미 확인. 1건 통과 (`assessed_pass`). 테스트는 별도 빌드 디렉터리를 사용합니다.
- 합성 공개 설정의 `npm run build`: 통과. `/home/renewal`, 이야기 목록과 두 상세가 정적 경로로 생성됨 (`assessed_pass`). 실제 Firebase 접수 검증은 아닙니다.
- `node scripts/verify-renewal-render.mjs`: Chrome 1440×900·모바일 에뮬레이션 390×844에서 가로 넘침 없음, 히어로 로딩, 모바일 메뉴 7개 항목 열림, 문의·이야기 화면 제목 확인 (`assessed_pass`).
- `git diff --check`: 통과.

## 콘텐츠 출처와 전환 경계

| 항목 | 작성 주체·원문·게시일 | 이번 페이지의 사용 범위 |
| --- | --- | --- |
| 이야기 250708 | 모스픽 기존 글 `/articles/250708`, 2025-07-08 | 개발 과정 요약. 기존 글의 수치·인용·성과 주장은 재사용하지 않음 |
| 이야기 251124 | 모스픽 기존 글 `/articles/251124`, 2025-11-24 | 발표·개발 배경 요약. 참석자 반응·성과 주장은 재사용하지 않음 |
| 언론 인터뷰 | 스마일게이트 뉴스룸, [원문](https://newsroom.smilegate.com/en/lab/morspeak_interview), 2026-07-30 | 한 가족 경험만 출처를 명시해 소개. 일반 효과로 확장하지 않음 |

- 확인된 과정: 잔존 움직임 평가 → 결과 검토 → 세팅 안내 → 교육 지원 → 커뮤니티의 개인 이용 흐름. 개인별 제공 조건은 안내에서 확인합니다.
- 출처가 있는 결과: 스마일게이트 뉴스룸이 전한 한 가족의 경험. 보도 출처와 단일 사례의 한계를 함께 표시합니다.
- 검증 전 기대 효과: 의사 표현 기회와 가족·돌봄 제공자와의 소통 방식 확대. 측정된 임팩트로 쓰지 않습니다.
- 합성 페르소나: 내부 페이지 검토 가설에만 사용하며 공개 고객 경험이나 성과로 전환하지 않습니다.
- 개인 CTA `/waitlist`: 희망 날짜를 고르는 이용 신청 접수이며, 해당 날짜 접수 순서에 따라 담당자가 연락해 절차를 안내합니다. 다섯 단계의 완료나 이용 가능성 보장은 아닙니다.
- 협업 CTA `/contact`: 기관의 도입·교육 논의 또는 기업의 접근성 기술 협력 제안 접수입니다. 제공·연동 범위는 문의 후 검토합니다.

## 화면 캡처

- [PC 홈 히어로](desktop-1440.png)
- [PC 이야기 구역](desktop-1440-stories.png)
- [PC 일상의 변화와 임팩트](desktop-1440-impact.png)
- [모바일 홈 히어로](mobile-390.png)
- [모바일 이야기 구역](mobile-390-stories.png)
- [모바일 일상의 변화와 임팩트](mobile-390-impact.png)
- [모바일 기관·기업 문의](mobile-390-contact.png)
- [모바일 이야기 목록](mobile-390-story-list.png)
- [모바일 이야기 상세](mobile-390-story-detail.png)

캡처는 빌드 산출물을 로컬 Next 서버로 연 뒤 Chrome에서 만들었습니다. 캡처 파일을 열어 한글 줄바꿈, 메뉴, 카드, CTA, 문의 입력칸을 직접 확인했습니다.

## 검토 시 남는 경계

- 화면과 링크는 로컬에서 검증했습니다. 실제 폼 제출·운영 접수, 실기기 Safari, 운영 배포는 검증하지 않았습니다.
- 스마일게이트 뉴스룸 인터뷰의 한 가족 경험은 단일 보도 사례로만 다뤘습니다. 제품의 일반적 효과나 임상 성과로 해석하지 않습니다.
- 실제 사용자 조작 영상과 공개 동의가 있는 성과 자료는 [필요 자료](../renewal-content-gaps.md)에 정리했습니다.
- 글로벌 root 교체와 프로덕션 배포는 이번 검토 대상이 아닙니다. 최종 검토 후 별도 결정이 필요합니다.
