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
          협력 방안 문의
        </h1>
        <p
          className="text-[16px] text-ms-secondary mb-2 max-w-lg"
          style={{ letterSpacing: "-0.01em", lineHeight: "1.6em" }}
        >
          협회·기관·단체에서 앱 사용 교육을 원하시거나 도입을 검토하시는 경우, 문의해
          주시기 바랍니다.
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
