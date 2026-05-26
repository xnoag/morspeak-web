import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "모스픽 검사 앱 다운로드 | Morspeak",
  description: "모스픽 사용 적합성 검사 앱을 다운로드하세요. ALS 환자의 눈 깜빡임 능력을 사전 검사합니다.",
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
