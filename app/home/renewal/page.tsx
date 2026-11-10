import type { Metadata } from "next";
import Renewal from "./Renewal";

export const metadata: Metadata = {
  title: "Morspeak | Small, Yet Significant",
  description: "모스픽 홈페이지 리뉴얼 디자인 미리보기",
  robots: { index: false, follow: false },
};

export default function RenewalPage() {
  return <Renewal />;
}
