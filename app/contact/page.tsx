import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "협력 문의하기 | 모스픽",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h1
          className="text-[28px] font-bold text-ms-dark mb-3"
          style={{ letterSpacing: "-0.01em" }}
        >
          기관·기업 협업 문의
        </h1>
        <p
          className="text-[16px] text-ms-secondary mb-2 max-w-lg"
          style={{ letterSpacing: "-0.01em", lineHeight: "1.6em" }}
        >
          협회·의료·돌봄 기관의 도입·교육이나 기업의 접근성 기술 협력을 제안하려면,
          조직의 역할과 협력 구상을 알려 주시기 바랍니다. 가능한 범위는 문의 내용을 바탕으로 검토합니다.
        </p>
        <p
          className="text-[13px] text-ms-muted mb-10"
          style={{ letterSpacing: "-0.3px" }}
        >
          남겨주신 정보는 협의 목적에 한해 사용되며, 안전하게 관리됩니다.
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
