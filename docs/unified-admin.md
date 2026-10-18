# Morspeak 통합 관리자

2026-10-18 상태: 단순 통합 초안, 운영 미배포. 후속 사용자 지시로 운영 전체의 목적·구조·데이터 흐름을 먼저 재정의·재설계하는 단계로 전환했습니다. 이 초안은 보존용이며 새 설계의 확정 구조가 아닙니다. 앞선 배포 승인에 따른 운영 배포는 진행하지 않습니다. 대표 1인 사용.

## 목표와 범위

`/admin` → `/admin/workspace/tracking`으로 진입한다. 기존 관리자 세션을 재사용하고 공통 메뉴와 가온 스타일 작업면에서 관리한다. 공통 프레임·탐색·선택 후 오른쪽 상세 방식만 재사용하며, 패널 내부는 각 업무의 정보와 조작을 유지한다. 채팅·연락처 기능을 추가하지 않는다.

| 메뉴 | 통합 URL (/admin/workspace 뒤) | 재사용한 기존 화면 | 기존 원본 |
|---|---|---|---|
| 스크리닝·선정·신청·대여·일정 | /screening | /admin/screening | screening_results, applications, qualitative_scores, final_config, equipment_loans, schedule_slots, call_notes |
| 사용 현황·환우 상세 | /tracking, /tracking/patients/[code] | /tracking/dashboard, /tracking/patients/[code] | usageStats 및 daily/sessions/speaks, patients, blinkProfiles, shortcuts, youtubeSuggestions, educationSessions, tutorialConfig, featureFlags, deviceStatus |
| 그룹 교육 | /group | /tracking/group | 기존 tutorialConfig, usageStats, deviceStatus, featureFlags |
| 설문 관리 | /survey | /survey-admin | survey_responses |
| 설문 마인드맵 | /survey-map | /survey-mindmap | survey_responses |
| 교육 신청 | /training | /schedule/training/admin | training_slots |
| 대기자 | /waitlist | /waitlist/admin | waitlist |
| 후기 | /reviews | /review/admin | review_sessions와 기존 첨부 경로 |
| 문의 | /inquiries | /admin/inquiries | inquiries |

기존 URL·문서 ID·데이터 경로·첨부 참조·쿼리·계산·내보내기·원격 명령을 재사용한다. 기존 스크리닝 결과 화면 `/screeningresult`도 보존한다. 데이터 복사·마이그레이션·동일인 자동 병합은 하지 않는다. SQL 기반 `/api/screening`과 Blob 업로드 API도 그대로 둔다. 통합 화면은 기존 관리자 화면이 조회하는 Firestore 원본을 사용한다.

재단 증빙·예산 `/receipts/*`는 사용자 결정으로 제외한다. 기능·파일·조직별 접근·이메일 인증을 변경하지 않는다. 공개 신청·예약·설문·익명 공유 화면도 보존한다.

## 구현과 검증 경계

- 서버 레이아웃과 기존 proxy의 관리자 세션 확인 후 작업 공간을 제공한다. 작업 공간 내부에서는 같은 관리자의 화면별 클라이언트 비밀번호 입력을 반복하지 않는다. 기존 URL의 게이트는 보존한다.
- 로그인 자격증명은 기존 ADMIN_ID/ADMIN_PASSWORD를 사용한다. 자격증명 미설정 시 로그인 요청은 거절하며 외부 로그인 리다이렉트는 허용하지 않는다.
- tracking의 목록은 layout에 유지해 상세를 열고 닫아도 검색이 남는다. 작은 화면에서는 상세를 우선 표시한다.
- 설문 편집 중 메뉴 이동·로그아웃·페이지 이탈은 저장하지 않은 입력을 확인한다.
- 운영 데이터 쓰기, 첨부 업로드/삭제, 환자 기기 원격 명령은 자동 시험하지 않는다.

## 검증 방법

`node scripts/check-survey-admin.cjs`: 기존 문항·참여자 연결·내부 기록 구분·렌더링·엑셀·입력·수정 이력·동시 수정 회귀 검사.

`scripts/check-admin-workspace.cjs`: Firebase Auth/Firestore를 demo-morspeak-admin의 로컬 19099/18080 포트에서 실행한 상태로 사용한다. 개발 서버도 합성 Firebase 설정과 합성 관리자 자격증명을 사용한다. NEXT_PUBLIC_FIREBASE_EMULATORS=1은 development 및 demo- 프로젝트에서만 연결되며 production에서는 비활성이다. 이 검사는 FIRESTORE_EMULATOR_HOST=127.0.0.1:18080과 loopback 웹 주소를 강제한다. 외부 브라우저 네트워크를 차단한다. Playwright와 기존 firestore/seed 개발 의존성이 필요하다.

검사 항목: 로그인·로그아웃·미인증 직접 진입 차단, 전체 메뉴의 두 번째 로그인 없음, tracking 목록/상세·검색 유지, 기존/통합 화면의 같은 원본 메모 왕복, 스크리닝 세부 탭, 가온 배경·반경, 빈 메뉴 검색, 좁은 폭의 전체 화면 넘침, 계정 팝오버/Esc.

실제 환자 기기 명령, 운영 첨부 업로드, 운영 데이터의 실제 수정 왕복은 미실행이며 합성 데이터 검증과 구분한다. 기존 인증·DB 보안 규칙 전체의 보안 개선은 이번 변경이 아니다.
