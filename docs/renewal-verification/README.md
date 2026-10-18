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
- `npm test`: 일곱 영역, 목적지 HTTP 200, 이야기 목록·상세·원문 경로, 출처 구분, 개인·협업 CTA와 접수 의미 확인. 1건 통과 (`assessed_pass`). 테스트는 별도 빌드 디렉터리를 사용합니다.
- 합성 공개 설정의 `npm run build`: 통과. `/home/renewal`, 이야기 목록과 두 상세가 정적 경로로 생성됨 (`assessed_pass`). 실제 Firebase 접수 검증은 아닙니다.
- `node scripts/verify-renewal-render.mjs`: Chrome 1440×900·모바일 에뮬레이션 390×844에서 가로 넘침 없음, 히어로 로딩, 모바일 메뉴 7개 항목 열림, 문의·이야기 화면 제목 확인 (`assessed_pass`). 이야기 원문 출처와 언론 카드 화면을 추가 캡처해 직접 확인했습니다.
- 2026-10-18 CTA 재검증: 개인 소개 CTA를 ‘모스픽 이용 안내 신청’으로 맞추고, 신청이 개인 다섯 단계의 절차 안내 요청이며 평가·이용 가능성 확정은 아니라는 설명을 추가했습니다. 협업 문구는 기관·기업의 제안 접수와 범위 검토로 한정했습니다. 모바일 Chrome에서 `/home/renewal`의 개인·협업 CTA를 각각 클릭해 `/waitlist`의 ‘모스픽 이용 신청’, `/contact`의 ‘기관·기업 협업 문의’ 화면으로 이동하는 것을 확인했습니다. 입력·제출은 하지 않았습니다 (`assessed_pass`).
- `git diff --check`: 통과.
- 테스트와 빌드를 동시에 실행한 첫 시도는 테스트용 임시 타입 파일이 빌드 중 삭제돼 실패했습니다. 테스트 통과 뒤 빌드를 단독 실행해 통과했습니다. 콘텐츠 결함이 아닌 검증 실행 간 충돌입니다.

## 콘텐츠 출처와 전환 경계

| 항목 | 작성 주체·원문·게시일 | 이번 페이지의 사용 범위 |
| --- | --- | --- |
| 이야기 250708 | 모스픽 기존 글 `/articles/250708`, 2025-07-08 | 개발 과정 요약. 기존 글의 수치·인용·성과 주장은 재사용하지 않음 |
| 이야기 251124 | 모스픽 기존 글 `/articles/251124`, 2025-11-24 | 발표·개발 배경 요약. 참석자 반응·성과 주장은 재사용하지 않음 |
| 언론 인터뷰 | 스마일게이트 뉴스룸, [원문](https://newsroom.smilegate.com/en/lab/morspeak_interview), 2026-07-30 | 한 가족 경험만 출처를 명시해 소개. 일반 효과로 확장하지 않음 |

- 이야기 목록과 각 상세에는 작성 주체·게시일·기존 원문 경로를 표시합니다. 두 원문 경로의 HTTP 200과 상세에서 목록으로 돌아가는 링크를 검사했습니다. 언론 카드는 외부 보도로 표시하고 단일 카드에 불필요한 캐러셀 이동 버튼을 노출하지 않습니다.
- 확인된 과정: 잔존 움직임 평가 → 결과 검토 → 세팅 안내 → 교육 지원 → 커뮤니티의 개인 이용 흐름. 개인별 제공 조건은 안내에서 확인합니다.
- 출처가 있는 결과: 스마일게이트 뉴스룸이 전한 한 가족의 경험. 보도 출처와 단일 사례의 한계를 함께 표시합니다.
- 검증 전 기대 효과: 의사 표현 기회와 가족·돌봄 제공자와의 소통 방식 확대. 측정된 임팩트로 쓰지 않습니다.
- 합성 페르소나: 내부 페이지 검토 가설에만 사용하며 공개 고객 경험이나 성과로 전환하지 않습니다.
- 개인 CTA `/waitlist`: 희망 날짜를 고르는 이용 신청 접수이며, 해당 날짜 접수 순서에 따라 담당자가 연락해 절차를 안내합니다. 다섯 단계의 완료나 이용 가능성 보장은 아닙니다.
- 협업 CTA `/contact`: 기관의 도입·교육 논의 또는 기업의 접근성 기술 협력 제안 접수입니다. 제공·연동 범위는 문의 후 검토합니다.

## 화면 캡처

### AC 4 — 브랜드와 실행 화면 재검증 (2026-10-18)

- `Small, Yet Significant` 영문 슬로건, `#ff4800` 주황 상단과 흰 로고를 PC·모바일 캡처에서 확인했습니다. 기존 Hero 원본 3장과 모바일 `hero-1M.webp`·`hero-2M.webp`·`hero-3M.webp`가 각각 로딩됐고, 약 3.5초 대기 뒤 표시 사진이 바뀌는 것을 Chrome에서 확인했습니다. 입력 방식의 움직임 심볼 6개도 화면 DOM에서 확인했습니다 (`assessed_pass`).
- 빌드 산출물을 Chrome 1440×900 및 390×844에서 열었습니다. 두 크기 모두 회사·솔루션·일상의 변화·이용 안내·협업·이야기·언론의 7개 섹션 제목이 상단 메뉴에 가리지 않고 뷰포트 안에 있으며, 각 섹션의 문서 가로 너비가 뷰포트를 넘지 않았습니다. 모바일 메뉴 7개 항목, 개인 `/waitlist`와 협업 `/contact` CTA 이동, 이야기 목록·상세의 모바일 가로 넘침도 확인했습니다 (`assessed_pass`).
- 아래 히어로·변화·이야기·언론·신청·문의·이야기 상세 캡처를 직접 열어 한글 읽기, 카드와 텍스트 배치, 링크 표시를 확인했습니다. 두 CTA의 실제 폼 제출은 하지 않았습니다.
- 이번 재검증에서 `npx eslint app/home/renewal scripts/verify-renewal-render.mjs tests/renewal-navigation.test.mjs --quiet`와 합성 Firebase 공개 설정을 적용한 `npm run build`는 통과했습니다. 기본 빌드는 `/admin/inquiries`의 `auth/invalid-api-key`로 실패합니다. 전체 `npm run lint -- --quiet`는 이번 범위 밖의 기존 88개 오류로 실패하므로 전체 린트 게이트는 `blocked_by_gate`입니다. 이를 홈 콘텐츠 결함으로 분류하지 않습니다.

- [PC 홈 히어로](desktop-1440.png)
- [PC 이야기 구역](desktop-1440-stories.png)
- [PC 언론 구역](desktop-1440-press.png)
- [PC 일상의 변화와 임팩트](desktop-1440-impact.png)
- [모바일 홈 히어로](mobile-390.png)
- [모바일 이야기 구역](mobile-390-stories.png)
- [모바일 언론 구역](mobile-390-press.png)
- [모바일 일상의 변화와 임팩트](mobile-390-impact.png)
- [모바일 기관·기업 문의](mobile-390-contact.png)
- [모바일 개인 이용 신청](mobile-390-waitlist.png)
- [모바일 이야기 목록](mobile-390-story-list.png)
- [모바일 이야기 상세](mobile-390-story-detail.png)
- [모바일 이야기 원문·목록 복귀](mobile-390-story-detail-source.png)

캡처는 빌드 산출물을 로컬 Next 서버로 연 뒤 Chrome에서 만들었습니다. 캡처 파일을 열어 한글 줄바꿈, 메뉴, 카드, CTA, 문의 입력칸을 직접 확인했습니다.

## 검토 시 남는 경계

- 화면과 링크는 로컬에서 검증했습니다. 실제 폼 제출·운영 접수, 실기기 Safari, 운영 배포는 검증하지 않았습니다.
- 스마일게이트 뉴스룸 인터뷰의 한 가족 경험은 단일 보도 사례로만 다뤘습니다. 제품의 일반적 효과나 임상 성과로 해석하지 않습니다.
- 실제 사용자 조작 영상과 공개 동의가 있는 성과 자료는 [필요 자료](../renewal-content-gaps.md)에 정리했습니다.
- 글로벌 root 교체와 프로덕션 배포는 이번 검토 대상이 아닙니다. 최종 검토 후 별도 결정이 필요합니다.

## AC 5 — 변경 범위와 공개 주장 점검

- 비교 기준은 이 작업의 분기점 `19ef1bb`입니다. `git diff --name-status 19ef1bb --`로 **현재 작업 트리까지** 비교했습니다. 관리자 초안이 이미 있던 `feat/unified-admin`의 이전 커밋을 기준으로 판단하지 않습니다. 다른 작업의 worktree는 수정하지 않았습니다.
- 변경된 공개 경로는 `/home/renewal`, 새 하위 경로 `/home/renewal/stories`와 `/home/renewal/stories/[slug]`, 기존 `/contact`의 제목·안내 문구뿐입니다. `app/contact/page.tsx`의 문구 변경은 기록하며, 기존 `/contact` 주소가 변경되지 않았다고 해서 화면 내용까지 동일하다고 말하지 않습니다.
- 기존 `/contact` 접수폼 `components/ContactForm.tsx`는 비교 기준과 동일합니다. `/waitlist`의 화면·접수 처리 코드도 동일합니다. 폼 제출·운영 접수는 실행 검증하지 않았습니다.
- `app/admin`, `app/api`, `app/tracking`, `app/survey*`, `lib`, `firestore`, `firebase-functions`, `proxy.ts`는 비교 기준과 동일합니다. 관리자·인증·저장 데이터의 코드 및 규칙을 이번 홈페이지 작업에서 수정하지 않았습니다. 운영 데이터가 동일한지는 읽기·쓰기 검증을 수행하지 않았으므로 별도 확인이 필요합니다.
- 기존 공개주소를 제공하는 `app/page.tsx`, `app/home/page.tsx`, `app/waitlist/page.tsx`, `app/articles/[slug]/page.tsx`, `app/article*`, `app/blog`, `app/eng`, `app/jpn`, `app/robots.ts`, `app/layout.tsx`는 변경되지 않았습니다. root 교체나 운영 배포도 하지 않았습니다.
- 그 밖의 변경은 리뉴얼 콘텐츠와 스타일, 탐색 테스트·화면 검증 스크립트, 화면 캡처·기록, 테스트의 별도 빌드 폴더 설정(`next.config.ts`, `tsconfig.json`) 및 `npm test` 명령(`package.json`)입니다. `.ouroboros/context_pack.json`의 별도 미커밋 변경은 이 감사에서 수정하지 않았습니다.

| 공개 내용 | 근거 상태 | 원문·공개 범위 |
| --- | --- | --- |
| 입력과 개인 다섯 단계 | `confirmed_process` | 기존 제품·`/waitlist` 절차를 안내합니다. 개인별 적합성·제공 가능성은 평가와 안내에서 확인합니다. |
| 한 가족의 요청·음악 선택 경험 | `sourced_outcome` | [스마일게이트 뉴스룸 인터뷰](https://newsroom.smilegate.com/en/lab/morspeak_interview), 스마일게이트 작성·2026-07-30 게시. 공개 보도에 실린 경험을 출처와 함께 간접 서술하는 범위로만 사용합니다. 당사자의 별도 재게시 동의나 원기록은 확인하지 않았으므로 직접 인용·신원·영상·임상 결과로 확장하지 않습니다. |
| 소통 기회와 일상 선택의 확대 | `unverified_expectation` | 기대 방향임을 명시합니다. 측정된 제품 효과·임팩트 수치로 제시하지 않습니다. |
| 합성 페르소나 점검 | `synthetic_hypothesis` | 내부 화면 검토 가설입니다. 실제 사용자 발언·사례·성과로 게시하지 않습니다. |

모스픽 이야기 두 편은 모스픽의 기존 글 `/articles/250708`(2025-07-08), `/articles/251124`(2025-11-24)를 개발 과정 요약으로만 사용합니다. 목록과 상세에 작성 주체·게시일·원문 링크를 표시합니다. 공개 페이지에서 제품 효과, 사용자 수, 임상 성과, 수익 지표, 확정된 기업 연동, 가격을 주장하지 않았습니다. 해당 정보와 추가 사례를 게시하려면 원기록·현재 제공 범위·공개 동의를 먼저 확인해야 합니다.

AC 5 평가: `assessed_pass`. `git diff --exit-code 19ef1bb --`로 위 보호 경로와 접수폼의 동일성을 확인했고, `git diff --check`, 변경 범위 ESLint(`--quiet`), `npm test` 1건이 통과했습니다. 전체 린트의 기존 오류는 공통 게이트 `blocked_by_gate`로 계속 구분합니다. 실제 운영 데이터·제출·배포 상태는 평가하지 않았습니다.

## AC 6 — 최종 검토용 재검증 (2026-10-18)

- 작업 위치: 위 격리 worktree의 `ooo/ralph-5c503ddca64b27f7c02869ca0834a3`. 메인 체크아웃과 `feat/unified-admin`은 수정하지 않았습니다.
- 실패 원인을 먼저 재현했습니다. `npm run lint -- --quiet`는 기존 관리자·추적·공개 구 경로·Firebase 함수·제공된 MediaPipe 파일 등에서 88개 오류로 실패했습니다. 이번 리뉴얼 경로를 고쳐야 하는 오류는 없으며, 이 AC에서 보호 범위 밖 코드를 고치거나 규칙을 끄지 않았습니다. 전체 린트는 `blocked_by_gate`, 변경 범위 린트는 `assessed_pass`입니다.
- `npx tsc --noEmit`와 `npx eslint app/home/renewal app/contact/page.tsx scripts/verify-renewal-render.mjs tests/renewal-navigation.test.mjs --quiet`는 각각 종료 코드 0으로 통과했습니다 (`assessed_pass`).
- 설정 없는 `npm run build`는 `/admin/inquiries` 사전 렌더의 `auth/invalid-api-key`로 실패했습니다. `NEXT_PUBLIC_FIREBASE_API_KEY=synthetic-test-key`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-morspeak.test`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-morspeak`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-morspeak.appspot.com`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789`, `NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:synthetic`을 명령 프로세스에만 주입한 `npm run build`는 통과했습니다. 이는 빌드 재현용 설정이며 실제 인증·접수 검증이 아닙니다 (`assessed_pass`).
- `npm test` 1건 통과: 7개 탐색 영역, 개인·협업 목적지, 두 이야기의 목록·본문·기존 원문 경로, 출처·표현 경계와 HTTP 200을 확인했습니다 (`assessed_pass`).
- 합성 설정으로 만든 빌드 산출물을 `127.0.0.1:3187`에서 실행하고 `node scripts/verify-renewal-render.mjs`를 통과시켰습니다. Chrome 1440×900·모바일 에뮬레이션 390×844에서 가로 넘침 0, Hero 3장 로딩·자동 전환, 7개 영역의 제목 노출, 모바일 메뉴 7개 항목을 확인했습니다. `/waitlist`·`/contact` CTA 클릭과 모바일 이야기 목록→상세→목록 클릭 이동도 통과했습니다. 저장된 PC·모바일 히어로, 임팩트, 이야기, 언론, 두 신청·문의 화면과 이야기 출처 캡처를 다시 열어 한글 줄바꿈과 링크 표시를 확인했습니다 (`assessed_pass`).
- 출처 확인: 기존 모스픽 글 `/articles/250708`, `/articles/251124`는 로컬 빌드에서 HTTP 200입니다. [스마일게이트 뉴스룸 인터뷰](https://newsroom.smilegate.com/en/lab/morspeak_interview)는 검색 색인에서 2026-07-30 게시와 한 가족 경험의 보도 내용을 확인했으나, 현재 원문에 대한 직접 HTTP 요청은 503이었습니다. 외부 원문의 현재 접속 가능성은 `not_assessed`이며 공개 사이트의 링크는 유지했습니다. 보도 내용은 단일 사례를 넘는 효과 주장으로 사용하지 않았습니다.
- 화면 검토 링크: [PC 히어로](desktop-1440.png), [PC 변화](desktop-1440-impact.png), [모바일 히어로](mobile-390.png), [모바일 변화](mobile-390-impact.png), [모바일 이야기](mobile-390-stories.png), [모바일 언론](mobile-390-press.png), [모바일 이용 신청](mobile-390-waitlist.png), [모바일 협업 문의](mobile-390-contact.png), [모바일 이야기 본문과 출처](mobile-390-story-detail-source.png). 로컬 URL은 위 서버를 켠 동안에만 접근 가능합니다.
- 미확인: 실제 폼 제출·운영 접수, 실기기 Safari, 외부 원문의 현재 접속 가능성, 운영 배포. 글로벌 root 교체와 프로덕션 배포는 최종 검토 이후 별도 결정 사항입니다.
