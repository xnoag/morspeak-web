import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "법률 관련 정책 | 모스픽",
};

export default function LegalPoliciesPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[680px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-10"
          style={{ letterSpacing: "-0.01em" }}
        >
          법률 관련 정책
        </h1>

        <section className="mb-10">
          <h2
            className="text-[18px] font-semibold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            개인정보 처리방침
          </h2>
          <p
            className="text-[15px] text-ms-secondary leading-relaxed"
            style={{ letterSpacing: "-0.01em", lineHeight: "1.8em" }}
          >
            모스픽(Morspeak)은 사용자의 개인정보를 소중히 여기며, 관련 법령에 따라
            안전하게 관리합니다. 수집된 정보는 서비스 제공 및 개선 목적으로만
            사용됩니다.
          </p>
        </section>

        <section className="mb-10">
          <h2
            className="text-[18px] font-semibold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            서비스 이용약관
          </h2>
          <p
            className="text-[15px] text-ms-secondary leading-relaxed"
            style={{ letterSpacing: "-0.01em", lineHeight: "1.8em" }}
          >
            모스픽 서비스를 이용하시면 본 이용약관에 동의하신 것으로 간주합니다.
            서비스 이용 중 문의사항은{" "}
            <a
              href="mailto:hello@morspeak.com"
              className="text-ms-link underline"
            >
              hello@morspeak.com
            </a>
            으로 연락해 주세요.
          </p>
        </section>

        <section>
          <h2
            className="text-[18px] font-semibold text-ms-dark mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            문의
          </h2>
          <p
            className="text-[15px] text-ms-secondary"
            style={{ letterSpacing: "-0.01em" }}
          >
            법률 정책 관련 문의:{" "}
            <a href="mailto:hello@morspeak.com" className="text-ms-link">
              hello@morspeak.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
