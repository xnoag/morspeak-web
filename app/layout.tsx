import type { Metadata } from "next";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";

export const metadata: Metadata = {
  title: "모스픽 | Morspeak",
  description: "문의: 010-7641-1362 (모스픽 대표 한가온)",
  openGraph: {
    title: "모스픽 | Morspeak",
    description: "문의: 010-7641-1362 (모스픽 대표 한가온)",
    images: ["https://morspeak.com/og-image.png"],
  },
  icons: {
    icon: "https://framerusercontent.com/images/P9l2DEc8FwKtUKp8uBlFWioDZKU.png",
    apple: "https://framerusercontent.com/images/1HXtbwYoXwmf2tHp2bEfwWsoUlg.png",
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
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
