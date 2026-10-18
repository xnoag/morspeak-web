import type { Metadata } from "next";
import Renewal from "./Renewal";

export const metadata: Metadata = {
  title: "Morspeak | Small, Yet Significant",
  description: "모스픽은 작은 움직임을 입력으로 활용해 의사소통과 일상의 선택을 돕는 보조 기술을 만듭니다. 솔루션, 이용 안내, 협업, 이야기와 언론 소식을 살펴보세요.",
  robots: { index: false, follow: false },
};

export default function RenewalPage() {
  return <Renewal />;
}
