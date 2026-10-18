# 모스픽 기업 홈페이지 개편 검토 기록 — 2026-10-18

이 문서는 Ouroboros 격리 실행 당시의 1차 검증 기록입니다. 이후 홈페이지 전용 브랜치에 통합하고 문구·협업 경로·이야기 탐색을 보완한 최종 검토는 [final-review.md](final-review.md)를 기준으로 확인합니다. 아래 캡처는 1차 구현 시점의 자료입니다.

## 검토 대상

- 격리 worktree: `/Users/xnoag/.ouroboros/worktrees/morspeak-web/orch_afc21c60f87a`
- 브랜치: `ooo/orch_afc21c60f87a` (기준 `19ef1bb`)
- 대상: `/home/renewal`, `/home/renewal/stories`, 하위 이야기 페이지, `/waitlist`와 `/contact`로 향하는 링크
- 소스: `app/home/renewal/Renewal.tsx`, `app/home/renewal/renewal.module.css`, `app/home/renewal/stories/`, `app/contact/page.tsx`, `components/ContactForm.tsx`
- 검토용 로컬 URL: `http://127.0.0.1:3187/home/renewal` (`npm run start -- --hostname 127.0.0.1 --port 3187` 실행 중에만 접근 가능)

## 실행 검증

- `npx tsc --noEmit`: 통과.
- `npm test`: 리뉴얼 일곱 영역, 이야기 목록·상세 복귀, 개인·협업 CTA와 기존 링크의 HTTP 200, 언론 분리 확인. 1건 통과. 다른 개발 서버의 `.next/dev` 잠금과 충돌하지 않도록 테스트 전용 빌드 디렉터리를 사용하고 종료 시 제거합니다. 해당 경로는 `tsconfig.json`에 미리 포함해 테스트 실행으로 설정 파일이 다시 쓰이지 않게 했습니다.
- 변경 파일 대상 ESLint: 오류 0건, 기존 `<img>` 사용 경고 3건.
- 합성 Firebase 공개 설정을 주입한 `npm run build`: 통과. `/home/renewal`, 이야기 목록과 두 상세가 정적 경로로 생성됨.
- `node scripts/verify-renewal-render.mjs`: Chrome 실제 렌더에서 1440×900과 모바일 에뮬레이션 390×844의 뷰포트·가로 넘침·히어로 이미지·메뉴 모드 확인. 모바일 `/contact`의 `기관·기업 협업 문의` 제목과 이야기 목록·상세의 제목·가로 넘침 확인.
- `git diff --check`: 통과.
- 전체 `npm run lint`: 실패. 작업 범위 밖 관리자 코드와 중첩 `.claude/worktrees`를 포함해 88 오류, 789 경고가 출력됨. 이 결과를 전체 린트 통과로 해석하지 않음.

## 화면 캡처

- [PC 홈 히어로](desktop-1440.png)
- [PC 이야기 구역](desktop-1440-stories.png)
- [모바일 홈 히어로](mobile-390.png)
- [모바일 이야기 구역](mobile-390-stories.png)
- [모바일 기관·기업 문의](mobile-390-contact.png)
- [모바일 이야기 목록](mobile-390-story-list.png)
- [모바일 이야기 상세](mobile-390-story-detail.png)

캡처는 빌드 산출물을 로컬 Next 서버로 연 뒤 Chrome에서 만들었습니다. 캡처 파일을 열어 한글 줄바꿈, 메뉴, 카드, CTA, 문의 입력칸을 직접 확인했습니다.

## 검토 시 남는 경계

- 화면과 링크는 로컬에서 검증했습니다. 실제 폼 제출·운영 접수, 실기기 Safari, 운영 배포는 검증하지 않았습니다.
- 스마일게이트 뉴스룸 인터뷰의 한 가족 경험은 단일 보도 사례로만 다뤘습니다. 제품의 일반적 효과나 임상 성과로 해석하지 않습니다.
- 실제 사용자 조작 영상과 공개 동의가 있는 성과 자료는 [필요 자료](../renewal-content-gaps.md)에 정리했습니다.
- 글로벌 root 교체와 프로덕션 배포는 이번 검토 대상이 아닙니다. 최종 검토 후 별도 결정이 필요합니다.
