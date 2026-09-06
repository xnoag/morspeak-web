import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환자용 앱 개인정보처리방침 | 모스픽",
  description:
    "모스픽 환자용 앱이 수집하는 개인정보의 항목·목적·보유기간과 이용자의 권리를 안내합니다.",
};

// 기존 /legalpolicies 는 "적합성 검사 앱" 전용이라 환자용 앱의 수집 항목이 빠져 있었다.
// 이 페이지는 환자용 앱(iPad) 회원가입에서 실제로 받는 항목을 기준으로 작성했다.
// 근거: Morspeak/2. View/FirstRunSetupView.swift 의 SignUpView, FirebaseManager.registerPatient
//
// ⚠️ 법무 검토를 받지 않은 초안이다. 문구 확정 전에 검토가 필요하다.
const EFFECTIVE_DATE = "2026년 9월 7일";
const COMPANY = "가온한(Gaon Han)";
const EMAIL = "gaon@morspeak.com";

const COLLECTED: { group: string; items: string; why: string }[] = [
  {
    group: "환우 정보",
    items: "성명, 생년월일, 진단명, 담당 병원",
    why: "본인 확인, 상태에 맞는 입력 방식·감도 설정, 설치 및 사용 교육 지원",
  },
  {
    group: "보호자 정보",
    items: "성명, 환우와의 관계, 연령대, 연락처",
    why: "설치 안내, 문제 발생 시 연락, 보호자용 앱 연결",
  },
  {
    group: "계정 정보",
    items: "아이디, 비밀번호",
    why: "로그인 및 기기 간 설정 동기화",
  },
  {
    group: "이용 기록 (자동 수집)",
    items:
      "입력한 문장, 버튼 사용 횟수, 깜빡임 학습 데이터, 앱 사용 시간, 기기 상태",
    why: "감지 정확도 개선, 사용 현황 확인을 통한 지원, 서비스 품질 개선",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2
        className="text-[20px] font-bold text-ms-dark mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        {title}
      </h2>
      <div
        className="text-[16px] text-ms-secondary space-y-3"
        style={{ lineHeight: "1.7em", letterSpacing: "-0.01em" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function PatientPrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[720px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-2"
          style={{ letterSpacing: "-0.01em" }}
        >
          환자용 앱 개인정보처리방침
        </h1>
        <p className="text-[14px] text-ms-secondary mb-12">
          시행일: {EFFECTIVE_DATE} · {COMPANY}
        </p>

        <Section title="1. 수집하는 항목과 이용 목적">
          <p>
            모스픽 환자용 앱은 아래 항목을 수집합니다. 회원가입 시 동의를 받으며,
            동의하지 않으실 경우 서비스 이용이 어렵습니다.
          </p>
          <div className="mt-4 space-y-5">
            {COLLECTED.map((c) => (
              <div key={c.group}>
                <p className="font-semibold text-ms-dark">{c.group}</p>
                <p>수집 항목 — {c.items}</p>
                <p>이용 목적 — {c.why}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="2. 민감정보 처리">
          <p>
            진단명은 「개인정보 보호법」상 건강에 관한 정보로서 민감정보에 해당합니다.
            환우의 상태에 맞는 입력 방식과 감도를 설정하고, 도입 가능 여부를 판단하기
            위한 목적으로만 이용하며 다른 목적으로 이용하지 않습니다.
          </p>
        </Section>

        <Section title="3. 보유 및 파기">
          <p>
            서비스 이용이 종료될 때까지 보유하며, 이용자가 삭제를 요청하시면 지체 없이
            파기합니다. 앱에서 계정을 삭제하시거나 아래 연락처로 요청하실 수 있습니다.
          </p>
          <p>
            통계 분석에 활용하는 경우 개인을 알아볼 수 없도록 비식별 처리한 뒤
            이용합니다.
          </p>
        </Section>

        <Section title="4. 제3자 제공 및 처리 위탁">
          <p>
            수집한 정보를 제3자에게 판매하거나 제공하지 않습니다. 다만 서비스 운영에
            필요한 범위에서 아래 업체에 처리를 위탁합니다.
          </p>
          <div className="mt-3">
            <p className="font-semibold text-ms-dark">
              Google LLC (Firebase)
            </p>
            <p>위탁 업무 — 데이터 보관, 사용자 인증, 푸시 알림, 이용 통계</p>
          </div>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            이용자와 법정대리인은 언제든지 개인정보의 열람·정정·삭제·처리정지를 요청할
            수 있습니다. 환우 본인이 직접 요청하기 어려운 경우 보호자가 대신 요청하실 수
            있습니다.
          </p>
          <p>
            요청은 아래 연락처로 접수하며, 접수 후 지체 없이 처리하고 결과를
            알려드립니다.
          </p>
        </Section>

        <Section title="6. 안전성 확보 조치">
          <p>
            개인정보에 접근할 수 있는 인원을 최소한으로 제한하고, 전송 구간을
            암호화합니다. 접근 권한과 보안 설정을 정기적으로 점검합니다.
          </p>
        </Section>

        <Section title="7. 문의">
          <p>
            개인정보 보호책임자 — {COMPANY}
            <br />
            <a href={`mailto:${EMAIL}`} className="text-ms-link underline">
              {EMAIL}
            </a>
          </p>
          <p>
            이 방침이 변경되는 경우 시행일과 변경 내용을 이 페이지에 게시합니다.
          </p>
        </Section>
      </div>
    </main>
  );
}
