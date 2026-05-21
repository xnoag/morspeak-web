import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "모스픽 | Morspeak",
  description: "루게릭병 환우가 혼자서 할 수 있는 일을, 하나씩 늘려갑니다.",
  openGraph: {
    title: "모스픽 | Morspeak",
    description: "루게릭병 환우가 혼자서 할 수 있는 일을, 하나씩 늘려갑니다.",
    images: ["https://framerusercontent.com/assets/vEqJBAUr0UkOLV86LmPdmsJeto.png"],
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
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
