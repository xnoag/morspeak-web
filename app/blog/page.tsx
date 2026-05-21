import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 | 모스픽",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6 flex items-center justify-center">
      <p
        className="text-[19px] text-ms-secondary"
        style={{ letterSpacing: "-0.01em" }}
      >
        준비중입니다.
      </p>
    </main>
  );
}
