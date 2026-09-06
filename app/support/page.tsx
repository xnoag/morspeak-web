import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "지원 | 모스픽",
  description:
    "모스픽 사용 중 문제가 생겼을 때, 계정 정보를 잊었을 때 도움을 받는 방법을 안내합니다.",
};

// 환자용 앱의 로그인 화면 "아이디 또는 비밀번호를 잊으셨나요?" 가 이 페이지로 온다.
// (Morspeak/2. View/FirstRunSetupView.swift — LoginView.supportURL)
// 예전에는 "준비중입니다" 한 줄이어서, 앱에서 보낼 곳이 없었다.
const EMAIL = "gaon@morspeak.com";

const CASES: { title: string; body: string; mailSubject: string }[] = [
  {
    title: "아이디나 비밀번호를 잊으셨나요?",
    body:
      "직접 재설정하는 기능은 아직 없습니다. 아래로 문의해주시면 확인 후 도와드립니다. 환우명과 보호자 연락처를 함께 적어주시면 더 빠릅니다.",
    mailSubject: "모스픽 계정 문의 (아이디·비밀번호 찾기)",
  },
  {
    title: "깜빡임이 잘 인식되지 않나요?",
    body:
      "설정에서 감도를 조절할 수 있습니다. 조절해도 나아지지 않으면 사용 환경(조명, 기기 거치 위치, 화면과의 거리)을 알려주시면 함께 확인해드립니다.",
    mailSubject: "모스픽 문의 (깜빡임 인식)",
  },
  {
    title: "눈 깜빡임이 어려운 환우인가요?",
    body:
      "입 벌림, 눈썹 올림, 입김, 물리 버튼(원키) 등 다른 입력 방식을 지원합니다. 환우가 어떤 움직임이 가능한지 알려주시면 맞는 방식을 안내해드립니다.",
    mailSubject: "모스픽 문의 (입력 방식 변경)",
  },
  {
    title: "개인정보 열람·삭제를 원하시나요?",
    body:
      "언제든 요청하실 수 있습니다. 환우 본인이 직접 요청하기 어려운 경우 보호자가 대신 요청하실 수 있습니다.",
    mailSubject: "모스픽 개인정보 처리 요청",
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[720px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-3"
          style={{ letterSpacing: "-0.01em" }}
        >
          지원
        </h1>
        <p
          className="text-[17px] text-ms-secondary mb-12"
          style={{ lineHeight: "1.7em", letterSpacing: "-0.01em" }}
        >
          사용 중 어려움이 있으시면 언제든 알려주세요. 아래 메일로 보내주시면 확인 후
          답변드립니다.
        </p>

        <a
          href={`mailto:${EMAIL}`}
          className="inline-block text-[19px] font-semibold text-ms-link underline mb-14"
        >
          {EMAIL}
        </a>

        <div className="space-y-10">
          {CASES.map((c) => (
            <section key={c.title}>
              <h2
                className="text-[19px] font-bold text-ms-dark mb-2"
                style={{ letterSpacing: "-0.01em" }}
              >
                {c.title}
              </h2>
              <p
                className="text-[16px] text-ms-secondary mb-3"
                style={{ lineHeight: "1.7em", letterSpacing: "-0.01em" }}
              >
                {c.body}
              </p>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(c.mailSubject)}`}
                className="text-[16px] text-ms-link underline"
              >
                이 내용으로 문의하기
              </a>
            </section>
          ))}
        </div>

        <hr className="my-14 border-gray-200" />

        <p
          className="text-[16px] text-ms-secondary"
          style={{ lineHeight: "1.7em", letterSpacing: "-0.01em" }}
        >
          개인정보 처리에 관한 내용은{" "}
          <Link href="/legalpolicies/patient" className="text-ms-link underline">
            환자용 앱 개인정보처리방침
          </Link>
          에서 확인하실 수 있습니다. 협회·기관 도입 문의는{" "}
          <Link href="/contact" className="text-ms-link underline">
            협력 문의
          </Link>
          로 보내주세요.
        </p>
      </div>
    </main>
  );
}
