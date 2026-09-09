import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 및 데이터 삭제 | 모스픽",
  description:
    "모스픽 환자용 앱의 계정과 데이터를 삭제하는 방법, 삭제되는 항목과 보관 기간을 안내합니다.",
};

// Google Play 「데이터 보안」 선언이 요구하는 계정 삭제 안내 페이지다.
// Play 가 명시한 세 가지를 모두 담아야 심사를 통과한다:
//   ① 스토어 등록정보에 표시되는 앱 또는 개발자 이름
//   ② 사용자가 계정 삭제를 요청하기 위해 취해야 할 단계
//   ③ 삭제되거나 보관되는 데이터 유형 및 추가 보관 기간
// (2026-09-09 — 이 페이지가 없어서 데이터 보안 선언이 막혀 있었다)
const EMAIL = "gaon@morspeak.com";

const DELETED = [
  "계정 정보 — 아이디, 환우명, 비밀번호(해시)",
  "보호자 정보 — 이름, 연락처, 관계, 연령대",
  "주고받은 메시지 — 환우가 보낸 문장과 「호출」 기록",
  "저장한 표현(단축어)",
  "깜빡임 학습값 — 짧게·길게 판정 기준",
  "사용 기록 — 말하기 횟수, 사용 시간 등 통계",
  "기기 알림 토큰",
];

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[720px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-3"
          style={{ letterSpacing: "-0.01em" }}
        >
          계정 및 데이터 삭제
        </h1>
        <p
          className="text-[17px] text-ms-secondary mb-12"
          style={{ lineHeight: "1.7em", letterSpacing: "-0.01em" }}
        >
          모스픽 환자용(Morspeak) 앱의 계정과 저장된 데이터를 삭제하는 방법입니다.
          모스픽은 한가온(모스픽)이 만들고 운영합니다.
        </p>

        <section className="mb-12">
          <h2
            className="text-[19px] font-bold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            앱에서 직접 삭제하기
          </h2>
          <ol
            className="text-[16px] text-ms-secondary list-decimal pl-5 space-y-2"
            style={{ lineHeight: "1.7em" }}
          >
            <li>모스픽 환자용 앱을 엽니다.</li>
            <li>
              오른쪽 위 톱니바퀴를 눌러 <strong>설정</strong>으로 들어갑니다.
              (환우가 깜빡임으로 들어가려면 <strong>━━━━━</strong> 를 입력합니다)
            </li>
            <li>화면 맨 아래 <strong>계정 삭제</strong>를 누릅니다.</li>
            <li>안내에 따라 확인하면 삭제가 끝납니다.</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2
            className="text-[19px] font-bold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            메일로 요청하기
          </h2>
          <p
            className="text-[16px] text-ms-secondary mb-3"
            style={{ lineHeight: "1.7em" }}
          >
            기기를 쓸 수 없는 상황이라면 메일로 요청해주셔도 됩니다.
            <strong> 아이디</strong>와 <strong>환우명</strong>, 보호자 연락처를 함께
            적어주시면 본인 확인 후 처리합니다. 접수일로부터 영업일 기준 7일 이내에
            삭제하고 결과를 회신합니다.
          </p>
          <a
            href={`mailto:${EMAIL}?subject=${encodeURIComponent("모스픽 계정 삭제 요청")}`}
            className="inline-block text-[19px] font-semibold text-ms-link underline"
          >
            {EMAIL}
          </a>
        </section>

        <section className="mb-12">
          <h2
            className="text-[19px] font-bold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            삭제되는 데이터
          </h2>
          <ul
            className="text-[16px] text-ms-secondary list-disc pl-5 space-y-2"
            style={{ lineHeight: "1.7em" }}
          >
            {DELETED.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p
            className="text-[16px] text-ms-secondary mt-4"
            style={{ lineHeight: "1.7em" }}
          >
            위 항목은 삭제 즉시 서버에서 지워지며 복구할 수 없습니다.
          </p>
        </section>

        <section>
          <h2
            className="text-[19px] font-bold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            보관되는 데이터
          </h2>
          <p
            className="text-[16px] text-ms-secondary"
            style={{ lineHeight: "1.7em" }}
          >
            개인을 알아볼 수 없도록 처리한 접속 기록은 서비스 오류 확인과 보안을 위해
            최대 <strong>90일</strong>까지 보관한 뒤 파기합니다. 이 기록에는 이름·연락처·
            주고받은 문장이 포함되지 않습니다. 법령이 별도의 보관 기간을 정한 경우에는
            그 기간을 따릅니다.
          </p>
        </section>
      </div>
    </main>
  );
}
