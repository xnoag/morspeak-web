import type { Metadata } from "next";
import { homepageMetadata } from "@/lib/homepage-metadata";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import FirebaseAuthBootstrap from "@/components/FirebaseAuthBootstrap";

export const metadata: Metadata = {
  ...homepageMetadata,
  verification: {
    google: "_h00yi2WRWANln_PIp4uD_mN-jk727hFyDEkQ6C-_K8",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body>
        {/* 익명 인증을 한 번 보장한다 — Firestore 규칙을 request.auth != null 로
            조이기 위한 준비. 자세한 이유는 컴포넌트 주석에 있다 */}
        <FirebaseAuthBootstrap />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
